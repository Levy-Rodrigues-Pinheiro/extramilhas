import { PriceHistory } from '@prisma/client'
import prisma from '../prisma'
import logger from '../logger'

export class PriceHistoryService {
  /**
   * For each active loyalty program, record one price_histories row for today
   * (if one doesn't already exist).  Uses the AVG and MIN CPM of today's
   * active offers; falls back to the program's stored avgCpmCurrent when no
   * offers are available.
   */
  async recordDailyPriceHistory(): Promise<void> {
    const programs = await prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, avgCpmCurrent: true },
    })

    const today = this.todayUtcMidnight()
    let created = 0

    for (const program of programs) {
      try {
        // 1. Check if today's entry already exists
        const existing = await prisma.priceHistory.findFirst({
          where: {
            programId: program.id,
            date: { gte: today, lt: this.addDays(today, 1) },
          },
          select: { id: true },
        })

        if (existing) {
          logger.debug('[PriceHistory] Entry already exists for today', {
            programSlug: program.slug,
            date: today.toISOString(),
          })
          continue
        }

        // 2. Aggregate CPM from today's active offers
        const agg = await prisma.offer.aggregate({
          where: {
            programId: program.id,
            isActive: true,
            isDeleted: false,
            createdAt: { gte: today },
          },
          _avg: { cpm: true },
          _min: { cpm: true },
        })

        // 3. Fall back to stored avgCpmCurrent when no offers found today
        const avgCpm =
          agg._avg.cpm !== null
            ? Number(agg._avg.cpm)
            : Number(program.avgCpmCurrent)

        const minCpm =
          agg._min.cpm !== null
            ? Number(agg._min.cpm)
            : Number(program.avgCpmCurrent)

        // 4. Insert record
        await prisma.priceHistory.create({
          data: {
            programId: program.id,
            date: today,
            avgCpm,
            minCpm,
            source: 'scraper',
          },
        })

        created++

        logger.debug('[PriceHistory] Record created', {
          programSlug: program.slug,
          avgCpm,
          minCpm,
          date: today.toISOString(),
        })
      } catch (err: any) {
        logger.error('[PriceHistory] Failed to record history for program', {
          programSlug: program.slug,
          error: err.message,
        })
      }
    }

    logger.info('[PriceHistory] Daily recording complete', {
      programsProcessed: programs.length,
      recordsCreated: created,
    })
  }

  /**
   * Return the last N days of price history for a given program slug.
   */
  async getRecentHistory(
    programSlug: string,
    days: number
  ): Promise<PriceHistory[]> {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { slug: programSlug },
      select: { id: true },
    })

    if (!program) {
      logger.warn('[PriceHistory] Program not found', { programSlug })
      return []
    }

    const since = this.addDays(this.todayUtcMidnight(), -days)

    const records = await prisma.priceHistory.findMany({
      where: {
        programId: program.id,
        date: { gte: since },
      },
      orderBy: { date: 'asc' },
    })

    return records
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Returns today's date at 00:00:00 UTC. */
  private todayUtcMidnight(): Date {
    const now = new Date()
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
  }

  /** Add (or subtract, with negative n) a number of days to a Date. */
  private addDays(date: Date, n: number): Date {
    const d = new Date(date)
    d.setUTCDate(d.getUTCDate() + n)
    return d
  }
}

export const priceHistoryService = new PriceHistoryService()
