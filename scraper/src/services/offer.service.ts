import { OfferClassification, OfferType } from '@prisma/client'
import prisma from '../prisma'
import logger from '../logger'
import { NormalizedOffer } from '../types'
import { config } from '../config'

export class OfferService {
  /**
   * Persist a normalized offer to the database.
   * 1. Find the loyalty program by slug.
   * 2. If not found, log warning and return.
   * 3. Upsert offer by title + programId.
   *    - If the offer already exists and is still active, skip it.
   *    - If new, insert with classification derived from CPM.
   * 4. After a successful insert, enqueue alert matching.
   */
  async saveOffer(normalized: NormalizedOffer): Promise<void> {
    // 1. Resolve program
    const program = await prisma.loyaltyProgram.findUnique({
      where: { slug: normalized.programSlug },
    })

    if (!program) {
      logger.warn('[OfferService] Program not found, skipping offer', {
        programSlug: normalized.programSlug,
        offerTitle: normalized.title,
      })
      return
    }

    // 2. Check if an active offer with the same title already exists for this program
    const existing = await prisma.offer.findFirst({
      where: {
        programId: program.id,
        title: normalized.title,
        isActive: true,
        isDeleted: false,
      },
      select: { id: true },
    })

    if (existing) {
      // Skip duplicates within the same scrape cycle
      logger.debug('[OfferService] Offer already active, skipping', {
        offerId: existing.id,
        title: normalized.title,
      })
      return
    }

    // 3. Insert new offer
    const classification = this.classifyOffer(normalized.cpm)

    const offer = await prisma.offer.create({
      data: {
        programId: program.id,
        type: normalized.type as OfferType,
        title: normalized.title,
        description: normalized.description,
        cpm: normalized.cpm,
        classification: classification as OfferClassification,
        sourceUrl: normalized.sourceUrl,
        expiresAt: normalized.expiresAt ?? null,
        isActive: true,
        isDeleted: false,
        metadata: normalized.metadata as object,
      },
    })

    logger.info('[OfferService] Offer saved', {
      offerId: offer.id,
      title: offer.title,
      cpm: Number(offer.cpm),
      classification: offer.classification,
    })

    // 4. Enqueue alert matching (lazy import to avoid circular deps)
    try {
      const { addAlertMatchJob } = await import('../queues/scraper.queue')
      await addAlertMatchJob(offer.id)
    } catch (err: any) {
      logger.error('[OfferService] Failed to enqueue alert match job', {
        offerId: offer.id,
        error: err.message,
      })
    }
  }

  /**
   * Mark all offers whose expiresAt is in the past as inactive.
   * Returns the count of deactivated offers.
   */
  async deactivateExpiredOffers(): Promise<number> {
    const result = await prisma.offer.updateMany({
      where: {
        isActive: true,
        isDeleted: false,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    })

    logger.info('[OfferService] Deactivated expired offers', {
      count: result.count,
    })

    return result.count
  }

  /**
   * Recalculate and persist AVG and MIN CPM for a program's active offers.
   */
  async updateProgramAvgCpm(programSlug: string): Promise<void> {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { slug: programSlug },
      select: { id: true },
    })

    if (!program) {
      logger.warn('[OfferService] Cannot update CPM — program not found', {
        programSlug,
      })
      return
    }

    const agg = await prisma.offer.aggregate({
      where: {
        programId: program.id,
        isActive: true,
        isDeleted: false,
      },
      _avg: { cpm: true },
      _min: { cpm: true },
    })

    const avgCpm = agg._avg.cpm ?? 25.0 // fall back to neutral value
    const minCpm = agg._min.cpm ?? 25.0

    await prisma.loyaltyProgram.update({
      where: { id: program.id },
      data: { avgCpmCurrent: avgCpm },
    })

    logger.info('[OfferService] Updated program CPM', {
      programSlug,
      avgCpm: Number(avgCpm),
      minCpm: Number(minCpm),
    })
  }

  /**
   * Classify a CPM value into one of the three tiers.
   *  cpm <= 20  → IMPERDIVEL
   *  cpm <= 30  → BOA
   *  cpm  > 30  → NORMAL
   */
  classifyOffer(cpm: number): 'IMPERDIVEL' | 'BOA' | 'NORMAL' {
    if (cpm <= config.cpm.imperdivelMax) return 'IMPERDIVEL'
    if (cpm <= config.cpm.boaMax) return 'BOA'
    return 'NORMAL'
  }
}

export const offerService = new OfferService()
