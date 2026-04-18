import { Worker, Job } from 'bullmq'
import getRedis from '../redis'
import { scrapers, getScraper } from '../scrapers/scraper.registry'
import { offerService } from '../services/offer.service'
import { alertMatcherService } from '../services/alert-matcher.service'
import { priceHistoryService } from '../services/price-history.service'
import logger from '../logger'
import { config } from '../config'

// ---------------------------------------------------------------------------
// Worker: offers-scraper
// ---------------------------------------------------------------------------

async function processScrapeJob(
  job: Job<{ programSlug: string }>
): Promise<void> {
  const { programSlug } = job.data

  // 1. Resolve scraper
  const scraper = getScraper(programSlug)
  if (!scraper) {
    logger.error('[Worker:scraper] No scraper registered for program', {
      programSlug,
    })
    return
  }

  // 2. Scrape raw offers
  logger.info('[Worker:scraper] Starting scrape', { programSlug })
  const rawOffers = await scraper.scrapeOffers()

  // 3. Normalize and save each offer
  let savedCount = 0
  for (const raw of rawOffers) {
    try {
      const normalized = (scraper as any).normalizeOffer
        ? (scraper as any).normalizeOffer(raw)
        : {
            programSlug,
            type: raw.type,
            title: raw.title,
            description: raw.description,
            cpm: raw.miles > 0 ? parseFloat(((raw.priceBrl / raw.miles) * 1_000).toFixed(2)) : 0,
            classification: offerService.classifyOffer(
              raw.miles > 0 ? (raw.priceBrl / raw.miles) * 1_000 : 0
            ),
            sourceUrl: raw.url,
            expiresAt: raw.expiresAt,
            metadata: { ...(raw.metadata ?? {}), miles: raw.miles, priceBrl: raw.priceBrl },
          }

      await offerService.saveOffer(normalized)
      savedCount++
    } catch (err: any) {
      logger.error('[Worker:scraper] Failed to save offer', {
        programSlug,
        title: raw.title,
        error: err.message,
      })
    }
  }

  // 4. Update program average CPM
  await offerService.updateProgramAvgCpm(programSlug)

  // 5. Log summary
  logger.info(`[Worker:scraper] Scraped ${savedCount} offers from ${programSlug}`, {
    programSlug,
    total: rawOffers.length,
    saved: savedCount,
  })
}

// ---------------------------------------------------------------------------
// Worker: alert-matcher
// ---------------------------------------------------------------------------

async function processAlertMatchJob(
  job: Job<{ offerId: string }>
): Promise<void> {
  const { offerId } = job.data
  logger.debug('[Worker:alert-matcher] Processing job', { offerId })
  await alertMatcherService.matchOfferToAlerts(offerId)
}

// ---------------------------------------------------------------------------
// Worker: price-history
// ---------------------------------------------------------------------------

async function processPriceHistoryJob(_job: Job): Promise<void> {
  logger.info('[Worker:price-history] Recording daily price history')
  await priceHistoryService.recordDailyPriceHistory()

  logger.info('[Worker:price-history] Deactivating expired offers')
  const count = await offerService.deactivateExpiredOffers()
  logger.info('[Worker:price-history] Maintenance complete', {
    expiredDeactivated: count,
  })
}

// ---------------------------------------------------------------------------
// Start all workers
// ---------------------------------------------------------------------------

export function startWorkers(): void {
  const connection = getRedis()

  // --- Scraper worker ---
  const scraperWorker = new Worker(
    config.queues.offersScraper,
    processScrapeJob,
    {
      connection,
      concurrency: 2,
    }
  )

  scraperWorker.on('completed', (job) => {
    logger.debug('[Worker:scraper] Job completed', { jobId: job.id })
  })

  scraperWorker.on('failed', (job, err) => {
    logger.error('[Worker:scraper] Job failed', {
      jobId: job?.id,
      error: err.message,
    })
  })

  // --- Alert matcher worker ---
  const alertWorker = new Worker(
    config.queues.alertMatcher,
    processAlertMatchJob,
    {
      connection,
      concurrency: 5,
    }
  )

  alertWorker.on('completed', (job) => {
    logger.debug('[Worker:alert-matcher] Job completed', { jobId: job.id })
  })

  alertWorker.on('failed', (job, err) => {
    logger.error('[Worker:alert-matcher] Job failed', {
      jobId: job?.id,
      error: err.message,
    })
  })

  // --- Price history worker ---
  const priceHistoryWorker = new Worker(
    config.queues.priceHistoryUpdater,
    processPriceHistoryJob,
    {
      connection,
      concurrency: 1,
    }
  )

  priceHistoryWorker.on('completed', (job) => {
    logger.debug('[Worker:price-history] Job completed', { jobId: job.id })
  })

  priceHistoryWorker.on('failed', (job, err) => {
    logger.error('[Worker:price-history] Job failed', {
      jobId: job?.id,
      error: err.message,
    })
  })

  logger.info('[Workers] All BullMQ workers started', {
    queues: [
      config.queues.offersScraper,
      config.queues.alertMatcher,
      config.queues.priceHistoryUpdater,
    ],
  })
}
