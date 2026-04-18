import logger from './logger'
import prisma from './prisma'
import { startCronJobs } from './jobs/cron.jobs'
import { startWorkers } from './queues/scraper.worker'
import { scrapers, getAllProgramSlugs } from './scrapers/scraper.registry'
import { offerService } from './services/offer.service'
import { startHttpServer } from './http-server'

async function main(): Promise<void> {
  logger.info('Milhas Extras Scraper starting...')

  // 1. Start HTTP server for real-time flight search (independent of DB/Redis)
  startHttpServer(3002)
  logger.info('HTTP flight search server started on port 3002')

  // 2. Verify database connectivity (optional — scraper features need it, flight search doesn't)
  try {
    await prisma.$connect()
    logger.info('Database connected')
  } catch (err: any) {
    logger.warn(`Database not available: ${err.message?.slice(0, 80)}. Flight search will still work.`)
    return; // Don't start cron/workers without DB, but HTTP server keeps running
  }

  // 3. Start BullMQ workers (scraper, alert-matcher, price-history)
  startWorkers()
  logger.info('Queue workers started')

  // 4. Register cron jobs (scrape every 5 min, maintenance every hour, history daily)
  startCronJobs()
  logger.info('Cron jobs scheduled')

  // 5. Run an initial scrape immediately on startup so the DB is populated
  //    before the first cron tick.
  const programs = getAllProgramSlugs()
  logger.info(`Running initial scrape for ${programs.length} programs: ${programs.join(', ')}`)

  for (const programSlug of programs) {
    try {
      const scraper = scrapers[programSlug]
      const rawOffers = await scraper.scrapeOffers()

      // Normalize via the base-class helper and persist
      for (const raw of rawOffers) {
        const normalized = (scraper as any).normalizeOffer
          ? (scraper as any).normalizeOffer(raw)
          : {
              programSlug,
              type: raw.type,
              title: raw.title,
              description: raw.description,
              cpm:
                raw.miles > 0
                  ? parseFloat(((raw.priceBrl / raw.miles) * 1_000).toFixed(2))
                  : 0,
              classification: offerService.classifyOffer(
                raw.miles > 0 ? (raw.priceBrl / raw.miles) * 1_000 : 0
              ),
              sourceUrl: raw.url,
              expiresAt: raw.expiresAt,
              metadata: {
                ...(raw.metadata ?? {}),
                miles: raw.miles,
                priceBrl: raw.priceBrl,
              },
            }

        await offerService.saveOffer(normalized)
      }

      await offerService.updateProgramAvgCpm(programSlug)
      logger.info(`  ${programSlug}: ${rawOffers.length} offers scraped`)
    } catch (err: any) {
      logger.error(`  ${programSlug}: ${err.message}`, { stack: err.stack })
    }
  }

  logger.info('MilhasTop Scraper ready and running!')
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

main().catch((err: Error) => {
  logger.error('Fatal error during startup', { message: err.message, stack: err.stack })
  process.exit(1)
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason })
})
