import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * PushService — envio de notificações via Expo Push Service.
 *
 * Boas práticas embutidas:
 *  - Valida formato do token (Expo exige ExponentPushToken[xxx]).
 *  - Quebra em chunks de 100 (limite da API Expo).
 *  - Identifica e remove tokens inválidos (DeviceNotRegistered) do DB
 *    automaticamente — evita acumular lixo.
 *
 * Não usa workers/fila ainda (Bull já está instalado mas pra essa escala
 * <10k tokens basta chamar inline). Quando crescer, mover pra job.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
  ) {
    // Access token opcional aumenta rate-limit de 600 → 1800/segundo.
    // Sem ele ainda funciona, só com throttle mais apertado.
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
    });
  }

  /**
   * Registra ou atualiza um token. Se o token já existe pra outro user,
   * transfere (usuário trocou de conta no mesmo aparelho).
   */
  async registerToken(params: {
    token: string;
    userId: string | null;
    platform: string;
    appVersion?: string;
  }) {
    const { token, userId, platform, appVersion } = params;

    if (!Expo.isExpoPushToken(token)) {
      const preview = String(token).slice(0, 20);
      this.logger.warn(`Invalid push token format: ${preview}...`);
      throw new Error('Token inválido — esperado formato ExponentPushToken[...]');
    }

    const existing = await this.prisma.deviceToken.findUnique({ where: { token } });
    let deviceToken;
    if (existing) {
      deviceToken = await this.prisma.deviceToken.update({
        where: { token },
        data: {
          userId,
          platform,
          appVersion,
          lastUsedAt: new Date(),
        },
      });
    } else {
      deviceToken = await this.prisma.deviceToken.create({
        data: { token, userId, platform, appVersion },
      });
    }

    // Atualiza lastActiveAt do user (alimenta reactivation cron)
    if (userId) {
      this.prisma.user
        .update({
          where: { id: userId },
          data: { lastActiveAt: new Date() } as any,
        })
        .catch(() => {
          /* silently ignore — not critical path */
        });
    }

    return deviceToken;
  }

  async unregisterToken(token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }

  /**
   * Envia pra um conjunto de tokens. Retorna tickets e remove tokens mortos.
   */
  async sendToTokens(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, any> },
  ): Promise<{ sent: number; errors: number }> {
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (validTokens.length === 0) return { sent: 0, errors: 0 };

    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (err) {
        this.logger.error(`Chunk send failed: ${(err as Error).message}`);
      }
    }

    let sent = 0;
    let errors = 0;
    const deadTokens: string[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const targetToken = validTokens[i];
      if (ticket.status === 'ok') {
        sent++;
      } else {
        errors++;
        // Token morto — dispositivo desinstalou app ou recebeu novo token
        if (ticket.details?.error === 'DeviceNotRegistered') {
          deadTokens.push(targetToken);
        }
        this.logger.warn(`Push error for ${targetToken.slice(0, 30)}: ${ticket.message}`);
      }
    }

    if (deadTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: deadTokens } } });
      this.logger.log(`Removed ${deadTokens.length} dead tokens`);
    }

    return { sent, errors };
  }

  /**
   * Envia pra todos os tokens ativos (últimos 60 dias).
   * Usado pra broadcast (novo bônus aprovado p/ todos).
   */
  async broadcast(payload: { title: string; body: string; data?: Record<string, any> }) {
    const cutoff = new Date(Date.now() - 60 * 86400_000);
    const devices = await this.prisma.deviceToken.findMany({
      where: { lastUsedAt: { gte: cutoff } },
      select: { token: true },
    });

    if (devices.length === 0) {
      this.logger.log('Broadcast skipped: no active devices');
      return { sent: 0, errors: 0, totalDevices: 0 };
    }

    const result = await this.sendToTokens(
      devices.map((d) => d.token),
      payload,
    );
    this.logger.log(
      `Broadcast "${payload.title}": ${result.sent}/${devices.length} delivered`,
    );
    return { ...result, totalDevices: devices.length };
  }

  /**
   * Envia pra um usuário específico (todos os devices dele).
   */
  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, any> },
  ) {
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (devices.length === 0) return { sent: 0, errors: 0 };
    return this.sendToTokens(devices.map((d) => d.token), payload);
  }

  /**
   * Broadcast especializado pra "bônus aprovado" que respeita TODAS as prefs:
   *  - filtra users com notifyBonus=false
   *  - filtra users com notifyProgramPairs não vazio E pair atual não está
   *  - manda WhatsApp em paralelo pra PRO tier + notifyWhatsApp + verified
   *
   * Usado no approve do BonusReport pra substituir o broadcast genérico.
   */
  async broadcastBonusAlert(pair: { fromSlug: string; toSlug: string; bonusPercent: number }, payload: {
    title: string;
    body: string;
    data: Record<string, any>;
  }): Promise<{ push: { sent: number; errors: number }; whatsapp: { sent: number; errors: number } }> {
    const cutoff = new Date(Date.now() - 60 * 86400_000);
    const pairKey = `${pair.fromSlug}:${pair.toSlug}`;

    // `as any` — tipos stale no Prisma Client local (dev-server antigo
    // prende DLL Windows). Campos existem no schema + no DB.
    const devices = (await this.prisma.deviceToken.findMany({
      where: { lastUsedAt: { gte: cutoff } },
      include: {
        user: {
          include: { preferences: true },
        },
      } as any,
    })) as any[];

    // Separa em 2 buckets
    const pushTargets: string[] = [];
    const whatsappTargets: string[] = [];

    for (const d of devices) {
      // Anônimo (userId=null): manda push, não filtra
      if (!d.userId || !d.user) {
        pushTargets.push(d.token);
        continue;
      }

      const prefs = d.user.preferences;
      // Sem prefs ainda = default (notify all)
      const wantsBonus = prefs?.notifyBonus ?? true;
      if (!wantsBonus) continue;

      let pairs: string[] = [];
      try {
        pairs = prefs ? JSON.parse(prefs.notifyProgramPairs || '[]') : [];
      } catch {
        pairs = [];
      }
      // Se user filtrou pares específicos e este não está, pula
      if (pairs.length > 0 && !pairs.includes(pairKey)) continue;

      pushTargets.push(d.token);

      // WhatsApp: PRO + verified + optin + tem phone
      const isPaid = d.user.subscriptionPlan === 'PRO';
      const wantsWhatsApp =
        isPaid &&
        (prefs?.notifyWhatsApp ?? false) &&
        !!prefs?.whatsappVerifiedAt &&
        !!d.user.whatsappPhone;
      if (wantsWhatsApp && d.user.whatsappPhone) {
        whatsappTargets.push(d.user.whatsappPhone);
      }
    }

    // Dedupe WhatsApp (user pode ter múltiplos devices)
    const uniquePhones = Array.from(new Set(whatsappTargets));

    const [pushResult, waResult] = await Promise.all([
      pushTargets.length > 0
        ? this.sendToTokens(pushTargets, payload)
        : Promise.resolve({ sent: 0, errors: 0 }),
      uniquePhones.length > 0
        ? this.whatsapp.broadcast(
            uniquePhones,
            `*${payload.title}*\n\n${payload.body}\n\nAbra o app pra calcular quanto vale pra você.`,
          )
        : Promise.resolve({ sent: 0, errors: 0 }),
    ]);

    this.logger.log(
      `Bonus alert ${pairKey}: push ${pushResult.sent}/${pushTargets.length}, whatsapp ${waResult.sent}/${uniquePhones.length}`,
    );

    return { push: pushResult, whatsapp: waResult };
  }

  /**
   * Stats pro admin.
   */
  async getStats() {
    const now = Date.now();
    const [total, last30d, last7d, byPlatform] = await Promise.all([
      this.prisma.deviceToken.count(),
      this.prisma.deviceToken.count({
        where: { lastUsedAt: { gte: new Date(now - 30 * 86400_000) } },
      }),
      this.prisma.deviceToken.count({
        where: { lastUsedAt: { gte: new Date(now - 7 * 86400_000) } },
      }),
      this.prisma.deviceToken.groupBy({
        by: ['platform'],
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      activeLast30d: last30d,
      activeLast7d: last7d,
      byPlatform: byPlatform.map((p) => ({ platform: p.platform, count: p._count._all })),
    };
  }
}
