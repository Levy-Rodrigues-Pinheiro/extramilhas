import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private prisma: PrismaService) {
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
    if (existing) {
      return this.prisma.deviceToken.update({
        where: { token },
        data: {
          userId,
          platform,
          appVersion,
          lastUsedAt: new Date(),
        },
      });
    }

    return this.prisma.deviceToken.create({
      data: { token, userId, platform, appVersion },
    });
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
