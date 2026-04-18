import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AlertType } from '../common/enums';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const projectId = this.configService.get<string>('firebase.projectId');
    const privateKey = this.configService.get<string>('firebase.privateKey');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');

    const firebaseConfigured = !!(projectId && privateKey && clientEmail);

    if (firebaseConfigured) {
      try {
        const admin = await import('firebase-admin');

        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              privateKey,
              clientEmail,
            }),
          });
        }

        // Fetch FCM token if stored (assume it's in user data or notifications metadata)
        // For now we send to topic per user ID as a pattern
        await admin.messaging().send({
          topic: `user_${userId}`,
          notification: { title, body },
          data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
        });

        this.logger.log(`FCM push sent to user=${userId}: ${title}`);
      } catch (err) {
        this.logger.error(`FCM push failed for user=${userId}`, err);
      }
    } else {
      this.logger.log(`PUSH NOTIFICATION: [${userId}] ${title} - ${body}`);
    }

    // Always persist in-app notification
    await this.createInAppNotification(userId, title, body, 'PUSH', data);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // Stub - integrate SendGrid in production
    this.logger.log(`EMAIL: ${to} - ${subject}`);

    const sendgridKey = this.configService.get<string>('sendgrid.apiKey');
    if (sendgridKey) {
      try {
        const sgMail = await import('@sendgrid/mail' as any);
        const fromEmail = this.configService.get<string>('sendgrid.fromEmail') ?? 'noreply@milhasextras.com.br';
        (sgMail as any).setApiKey(sendgridKey);
        await (sgMail as any).send({ to, from: fromEmail, subject, html });
      } catch (err) {
        this.logger.error(`SendGrid email failed to ${to}`, err);
      }
    }
  }

  async broadcastPush(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await Promise.all(userIds.map((id) => this.sendPush(id, title, body, data)));
  }

  async createInAppNotification(
    userId: string,
    title: string,
    body: string,
    type: string,
    data?: Record<string, any>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        data: data ? JSON.stringify(data) : undefined,
      },
    });
  }

  async sendAlertNotification(
    userId: string,
    alert: { id: string; type: AlertType; conditions: any },
    offer: { id: string; title: string; cpm: any; program?: { name: string } },
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (alert.type) {
      case AlertType.CPM_THRESHOLD: {
        const cpm = Number(offer.cpm).toFixed(2);
        title = 'Oferta de milhas abaixo do seu CPM alvo!';
        body = `${offer.title} — CPM: R$${cpm}`;
        break;
      }
      case AlertType.DESTINATION: {
        const conditions = alert.conditions as any;
        title = `Oferta para ${conditions.destination ?? 'seu destino'}!`;
        body = `${offer.title}`;
        break;
      }
      case AlertType.PROGRAM_PROMO: {
        const programName = offer.program?.name ?? 'Programa';
        title = `Promoção em ${programName}!`;
        body = `${offer.title}`;
        break;
      }
      default:
        title = 'Novo alerta de milhas!';
        body = offer.title;
    }

    const notifData = { alertId: alert.id, offerId: offer.id };

    // sendPush already creates an in-app notification internally,
    // so we only call sendPush here to avoid duplicate in-app entries.
    await this.sendPush(userId, title, body, notifData);
  }
}
