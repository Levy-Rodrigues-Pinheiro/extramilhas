import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Outbound webhooks. Parceiros registram URL + eventos; app POSTa payload
 * quando evento acontece com header X-Milhasextras-Signature (HMAC SHA-256
 * hex do body usando o secret).
 *
 * Eventos disponíveis (admin adiciona conforme cria):
 *   - bonus.activated
 *   - bonus.expired
 *   - offer.created
 *   - offer.expired
 *   - user.subscribed (plan change pra PREMIUM/PRO)
 *
 * Retry: best-effort. 1 tentativa síncrona. Se falhar, grava lastError e
 * incrementa totalFailed. Cron futuro pode fazer retry de failures.
 */
@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async listMine(userId: string) {
    return (this.prisma as any).outboundWebhook.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      // NÃO retorna secret em listagem por segurança
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        totalSent: true,
        totalSuccess: true,
        totalFailed: true,
        lastDeliveredAt: true,
        lastError: true,
        createdAt: true,
      },
    });
  }

  async create(
    userId: string,
    params: { name: string; url: string; events: string[] },
  ) {
    if (!/^https?:\/\//.test(params.url)) {
      throw new ForbiddenException('URL precisa ser http(s)');
    }
    const secret = randomBytes(32).toString('hex');
    const created = await (this.prisma as any).outboundWebhook.create({
      data: {
        ownerId: userId,
        name: params.name.slice(0, 100),
        url: params.url.slice(0, 500),
        events: JSON.stringify(params.events),
        secret,
      },
    });
    // Retorna secret APENAS na criação
    return {
      id: created.id,
      name: created.name,
      url: created.url,
      events: params.events,
      secret,
      note: 'Guarde o secret. Não poderá recuperá-lo depois.',
    };
  }

  async revoke(userId: string, webhookId: string) {
    const wh = await (this.prisma as any).outboundWebhook.findUnique({
      where: { id: webhookId },
    });
    if (!wh || wh.ownerId !== userId) throw new NotFoundException('Webhook não encontrado');
    await (this.prisma as any).outboundWebhook.update({
      where: { id: webhookId },
      data: { isActive: false },
    });
    return { revoked: true };
  }

  /**
   * Single-shot delivery attempt. Helper usado pelo dispatch com retry.
   */
  private async attemptDelivery(
    url: string,
    secret: string,
    body: string,
    event: string,
  ): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
      const signature = createHmac('sha256', secret).update(body).digest('hex');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Milhasextras-Signature': signature,
          'X-Milhasextras-Event': event,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return { ok: true, status: res.status };
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: (err as Error).message.slice(0, 500) };
    }
  }

  /**
   * Dispatcher com retry exponencial — best-effort tolerante a glitch curto.
   *
   * Bug fix HONEST_TEST_REPORT #8: antes era 1-shot só. Se parceiro tinha
   * 500ms de downtime, perdia o event. Agora 3 tentativas com delay
   * imediato / 1s / 3s (total 4s máx) — tolera instabilidade transient
   * sem virar fila persistente. Pra escala, migrar pra BullMQ futuro.
   */
  async dispatch(event: string, payload: Record<string, unknown>) {
    const webhooks = await (this.prisma as any).outboundWebhook.findMany({
      where: { isActive: true },
    });
    const matching = webhooks.filter((w: any) => {
      try {
        const events = JSON.parse(w.events) as string[];
        return events.includes(event) || events.includes('*');
      } catch {
        return false;
      }
    });
    if (matching.length === 0) return { dispatched: 0 };

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    let success = 0;
    let failed = 0;
    const delays = [0, 1000, 3000]; // ms

    for (const wh of matching) {
      let lastResult: { ok: boolean; error?: string } = { ok: false };
      for (let i = 0; i < delays.length; i++) {
        if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
        lastResult = await this.attemptDelivery(wh.url, wh.secret, body, event);
        if (lastResult.ok) break;
      }

      if (lastResult.ok) {
        success++;
        await (this.prisma as any).outboundWebhook.update({
          where: { id: wh.id },
          data: {
            totalSent: { increment: 1 },
            totalSuccess: { increment: 1 },
            lastDeliveredAt: new Date(),
            lastError: null,
          },
        });
      } else {
        failed++;
        await (this.prisma as any).outboundWebhook.update({
          where: { id: wh.id },
          data: {
            totalSent: { increment: 1 },
            totalFailed: { increment: 1 },
            lastError: `Failed after 3 retries: ${lastResult.error ?? 'unknown'}`.slice(0, 500),
          },
        });
      }
    }

    return { dispatched: matching.length, success, failed };
  }
}
