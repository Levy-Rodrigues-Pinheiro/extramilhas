import * as cron from 'node-cron'
import { addScrapeJob, addPriceHistoryJob } from '../queues/scraper.queue'
import { getAllProgramSlugs } from '../scrapers/scraper.registry'
import { AwardChartScraper } from '../scrapers/award-chart.scraper'
import logger from '../logger'
import { config } from '../config'

/**
 * Register all recurring cron jobs and start them.
 *
 * Schedule summary:
 *  - Every 5 min : scrape all programs
 *  - Every hour  : trigger price history job (also deactivates expired offers)
 *  - Daily 02:00 : record daily price history snapshot
 */
export function startCronJobs(): void {
  // -------------------------------------------------------------------------
  // Every 5 minutes — scrape all registered loyalty programs
  // -------------------------------------------------------------------------
  cron.schedule(config.cronScrapeAll, async () => {
    logger.info('[CRON] Starting scrape cycle for all programs')
    const programs = getAllProgramSlugs()
    for (const programSlug of programs) {
      try {
        await addScrapeJob(programSlug)
      } catch (err: any) {
        logger.error('[CRON] Failed to enqueue scrape job', {
          programSlug,
          error: err.message,
        })
      }
    }
    logger.info('[CRON] Scrape jobs enqueued', { count: programs.length })
  })

  // -------------------------------------------------------------------------
  // Every hour — maintenance: deactivate expired offers & update CPMs
  // (price history worker handles deactivation alongside recording)
  // -------------------------------------------------------------------------
  cron.schedule(config.cronUpdateCpm, async () => {
    logger.info('[CRON] Hourly maintenance: updating CPMs and deactivating expired offers')
    try {
      await addPriceHistoryJob()
    } catch (err: any) {
      logger.error('[CRON] Failed to enqueue hourly maintenance job', {
        error: err.message,
      })
    }
  })

  // -------------------------------------------------------------------------
  // Every day at 02:00 — record daily price history snapshot
  // -------------------------------------------------------------------------
  cron.schedule(config.cronPriceHistory, async () => {
    logger.info('[CRON] Daily price history recording')
    try {
      await addPriceHistoryJob()
    } catch (err: any) {
      logger.error('[CRON] Failed to enqueue daily price history job', {
        error: err.message,
      })
    }
  })

  // -------------------------------------------------------------------------
  // Daily at 03:00 — Attempt to update award charts
  // -------------------------------------------------------------------------
  cron.schedule('0 3 * * *', async () => {
    logger.info('[CRON] Running daily award chart scrape...')
    try {
      const awardChartScraper = new AwardChartScraper()
      const entries = await awardChartScraper.scrapeAwardCharts()
      logger.info('[CRON] Award chart scrape completed', { entries: entries.length })
    } catch (err: any) {
      logger.error('[CRON] Award chart scrape failed', {
        error: err.message,
      })
    }
  })

  logger.info('[CRON] All cron jobs scheduled', {
    scrapeAll: config.cronScrapeAll,
    updateCpm: config.cronUpdateCpm,
    priceHistory: config.cronPriceHistory,
    awardCharts: '0 3 * * *',
  })
}
