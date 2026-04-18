import prisma from '../prisma'
import logger from '../logger'
import { notificationService } from './notification.service'
import {
  CpmThresholdConditions,
  ProgramPromoConditions,
  DestinationConditions,
} from '../types'

export class AlertMatcherService {
  /**
   * Match a newly saved offer against all active user alerts.
   * For each matching alert (subject to cooldown), send a notification and
   * record an AlertHistory entry.
   */
  async matchOfferToAlerts(offerId: string): Promise<void> {
    // 1. Fetch offer with program data
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { program: true },
    })

    if (!offer) {
      logger.warn('[AlertMatcher] Offer not found', { offerId })
      return
    }

    // 2. Get all active alerts
    const alerts = await prisma.alert.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true, email: true } } },
    })

    logger.debug('[AlertMatcher] Checking offer against alerts', {
      offerId,
      alertCount: alerts.length,
      offerTitle: offer.title,
    })

    // 3 & 4. Evaluate each alert
    for (const alert of alerts) {
      try {
        const conditions = alert.conditions as Record<string, any>
        let matched = false

        switch (alert.type) {
          case 'CPM_THRESHOLD':
            matched = this.matchesCpmThreshold(offer, conditions)
            break
          case 'PROGRAM_PROMO':
            matched = this.matchesProgramPromo(offer, conditions)
            break
          case 'DESTINATION':
            matched = this.matchesDestination(offer, conditions)
            break
          default:
            logger.warn('[AlertMatcher] Unknown alert type', { type: alert.type })
        }

        if (!matched) continue

        // 4a. Cooldown check — skip if this alert was already triggered for
        //     this specific offer (look for an existing AlertHistory entry)
        const alreadyTriggered = await prisma.alertHistory.findFirst({
          where: { alertId: alert.id, offerId: offer.id },
          select: { id: true },
        })

        if (alreadyTriggered) {
          logger.debug('[AlertMatcher] Alert already triggered for offer, skipping', {
            alertId: alert.id,
            offerId: offer.id,
          })
          continue
        }

        // 4b. Update lastTriggeredAt
        await prisma.alert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        })

        // 4c. Record history
        await prisma.alertHistory.create({
          data: {
            alertId: alert.id,
            offerId: offer.id,
            channel: 'PUSH',
          },
        })

        // 4d. Send notification
        const offerForNotif = {
          id: offer.id,
          title: offer.title,
          cpm: Number(offer.cpm),
          classification: offer.classification,
          metadata: offer.metadata as Record<string, any> | null,
          program: offer.program
            ? { name: offer.program.name, slug: offer.program.slug }
            : null,
        }

        await notificationService.sendAlertNotification(
          alert.userId,
          { id: alert.id, type: alert.type, conditions },
          offerForNotif
        )

        logger.info('[AlertMatcher] Alert triggered', {
          alertId: alert.id,
          userId: alert.userId,
          offerId: offer.id,
          alertType: alert.type,
        })
      } catch (err: any) {
        logger.error('[AlertMatcher] Error processing alert', {
          alertId: alert.id,
          offerId,
          error: err.message,
        })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private matchers
  // ---------------------------------------------------------------------------

  private matchesCpmThreshold(
    offer: { cpm: any; program: { slug: string } | null },
    conditions: Partial<CpmThresholdConditions>
  ): boolean {
    const cpm = Number(offer.cpm)
    const maxCpm = conditions.maxCpm

    if (maxCpm === undefined || maxCpm === null) return false
    if (cpm > maxCpm) return false

    // If a specific program is required, verify it matches
    if (conditions.programSlug && offer.program?.slug !== conditions.programSlug) {
      return false
    }

    return true
  }

  private matchesProgramPromo(
    offer: { program: { slug: string } | null },
    conditions: Partial<ProgramPromoConditions>
  ): boolean {
    if (!conditions.programSlug) return false
    return offer.program?.slug === conditions.programSlug
  }

  private matchesDestination(
    offer: { metadata: any; program: { slug: string } | null },
    conditions: Partial<DestinationConditions>
  ): boolean {
    if (!conditions.destination) return false

    const metadata = offer.metadata as Record<string, any> | null
    const offerDestination =
      metadata?.destination ?? metadata?.route ?? ''

    if (!offerDestination) return false

    const condDest = conditions.destination.toLowerCase().trim()
    const offerDest = String(offerDestination).toLowerCase().trim()

    const destinationMatch =
      offerDest.includes(condDest) || condDest.includes(offerDest)

    if (!destinationMatch) return false

    // Optional program slug filter
    if (conditions.programSlug && offer.program?.slug !== conditions.programSlug) {
      return false
    }

    return true
  }
}

export const alertMatcherService = new AlertMatcherService()
