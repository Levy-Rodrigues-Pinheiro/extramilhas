import prisma from '../prisma'
import logger from '../logger'

export class NotificationService {
  /**
   * Build and dispatch the correct notification message for a matched alert,
   * then persist an in-app notification record.
   */
  async sendAlertNotification(
    userId: string,
    alert: {
      id: string
      type: string
      conditions: Record<string, any>
    },
    offer: {
      id: string
      title: string
      cpm: number
      classification: string
      metadata?: Record<string, any> | null
      program?: { name: string; slug: string } | null
    }
  ): Promise<void> {
    let pushTitle = 'MilhasTop — Nova Oferta'
    let pushBody = offer.title

    const programName = offer.program?.name ?? offer.program?.slug ?? 'programa'
    const cpmFormatted = `R$${offer.cpm.toFixed(2).replace('.', ',')}`

    switch (alert.type) {
      case 'CPM_THRESHOLD':
        pushTitle = `🔥 Nova oferta ${programName}`
        pushBody = `CPM ${cpmFormatted}/1.000 — ${this.classificationLabel(offer.classification)}!`
        break

      case 'PROGRAM_PROMO':
        pushTitle = `🎯 Nova promoção ${programName} disponível`
        pushBody = offer.title
        break

      case 'DESTINATION': {
        const destination =
          (alert.conditions as any).destination ??
          (offer.metadata as any)?.destination ??
          'destino'
        const miles =
          offer.metadata && typeof (offer.metadata as any).miles === 'number'
            ? Math.round((offer.metadata as any).miles / 1_000)
            : null
        pushTitle = `✈️ Oferta para ${destination} encontrada!`
        pushBody = miles
          ? `${miles}k milhas com ${programName} — CPM ${cpmFormatted}`
          : `${offer.title} com ${programName}`
        break
      }

      default:
        pushTitle = `MilhasTop — Nova oferta ${programName}`
        pushBody = offer.title
    }

    const notifData: Record<string, unknown> = {
      alertId: alert.id,
      offerId: offer.id,
      cpm: offer.cpm,
      classification: offer.classification,
    }

    await this.sendPush(userId, pushTitle, pushBody, notifData)
    await this.createInAppNotification(
      userId,
      pushTitle,
      pushBody,
      alert.type,
      notifData
    )
  }

  /**
   * Stub for Firebase FCM push notification.
   * In production, replace with real FCM HTTP v1 API call.
   */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    logger.info(`[PUSH] → ${userId}: ${title} - ${body}`, {
      data,
    })
    // TODO: integrate Firebase Admin SDK
    // await firebaseAdmin.messaging().send({ token: userFcmToken, notification: { title, body }, data })
  }

  /**
   * Persist a notification record visible in the user's in-app notification centre.
   */
  async createInAppNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          type,
          isRead: false,
          data: data ? (data as object) : undefined,
        },
      })

      logger.debug('[NotificationService] In-app notification created', {
        userId,
        type,
        title,
      })
    } catch (err: any) {
      logger.error('[NotificationService] Failed to create in-app notification', {
        userId,
        error: err.message,
      })
    }
  }

  /**
   * Stub for transactional email sending.
   * In production, replace with SendGrid / SES / Resend call.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    logger.info(`[EMAIL] → ${to}: ${subject}`, { html })
    // TODO: integrate email provider
    // await sgMail.send({ to, from: 'noreply@milhastop.com', subject, html })
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private classificationLabel(classification: string): string {
    switch (classification) {
      case 'IMPERDIVEL':
        return 'Imperdível'
      case 'BOA':
        return 'Boa oferta'
      default:
        return 'Normal'
    }
  }
}

export const notificationService = new NotificationService()
