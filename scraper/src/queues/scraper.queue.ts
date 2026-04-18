import { Queue } from 'bullmq'
import getRedis from '../redis'
import logger from '../logger'
import { config } from '../config'

// Shared connection for all queues (BullMQ requires maxRetriesPerRequest: null)
const connection = getRedis()

// ---------------------------------------------------------------------------
// Queue instances
// ---------------------------------------------------------------------------

export const scraperQueue = new Queue(config.queues.offersScraper, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
})

export const alertMatcherQueue = new Queue(config.queues.alertMatcher, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
})

export const priceHistoryQueue = new Queue(config.queues.priceHistoryUpdater, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10_000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 50 },
  },
})

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Enqueue a scrape job for a single loyalty program.
 */
export async function addScrapeJob(programSlug: string): Promise<void> {
  await scraperQueue.add(
    `scrape:${programSlug}`,
    { programSlug },
    { jobId: `scrape:${programSlug}:${Date.now()}` }
  )
  logger.debug('[Queue] Scrape job added', { programSlug })
}

/**
 * Enqueue an alert-matching job for a newly saved offer.
 */
export async function addAlertMatchJob(offerId: string): Promise<void> {
  await alertMatcherQueue.add(
    `alert-match:${offerId}`,
    { offerId },
    { jobId: `alert-match:${offerId}` }
  )
  logger.debug('[Queue] Alert match job added', { offerId })
}

/**
 * Enqueue a price-history recording job (runs once per call, idempotent via jobId).
 */
export async function addPriceHistoryJob(): Promise<void> {
  // Use a date-based jobId so only one job runs per day per queue
  const dateKey = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  await priceHistoryQueue.add(
    `price-history:${dateKey}`,
    {},
    { jobId: `price-history:${dateKey}` }
  )
  logger.debug('[Queue] Price history job added', { dateKey })
}
