import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

/**
 * Lista conservadora de rotas populares a pré-aquecer.
 * Ordem de prioridade: rotas domésticas hot → LATAM → longo-curso.
 * Se isto crescer, mover pra DB + admin pode editar.
 */
const POPULAR_ROUTES: Array<{ origin: string; destination: string }> = [
  // Doméstico BR
  { origin: 'GRU', destination: 'GIG' },
  { origin: 'GIG', destination: 'GRU' },
  { origin: 'GRU', destination: 'BSB' },
  { origin: 'GRU', destination: 'REC' },
  { origin: 'GRU', destination: 'SSA' },
  { origin: 'GRU', destination: 'FOR' },
  { origin: 'GRU', destination: 'POA' },
  { origin: 'GRU', destination: 'CNF' },
  { origin: 'GRU', destination: 'CWB' },
  { origin: 'GRU', destination: 'MAO' },
  // LATAM
  { origin: 'GRU', destination: 'EZE' },
  { origin: 'GRU', destination: 'SCL' },
  { origin: 'GRU', destination: 'BOG' },
  { origin: 'GRU', destination: 'LIM' },
  { origin: 'GRU', destination: 'MVD' },
  // EUA
  { origin: 'GRU', destination: 'MIA' },
  { origin: 'GRU', destination: 'JFK' },
  { origin: 'GRU', destination: 'ORD' },
  { origin: 'GRU', destination: 'LAX' },
  { origin: 'GIG', destination: 'MIA' },
  // Europa
  { origin: 'GRU', destination: 'LIS' },
  { origin: 'GRU', destination: 'MAD' },
  { origin: 'GRU', destination: 'CDG' },
  { origin: 'GRU', destination: 'FCO' },
  { origin: 'GRU', destination: 'LHR' },
  { origin: 'GRU', destination: 'FRA' },
];

/**
 * SchedulerService — jobs recorrentes do backend.
 *
 * 1. preWarmScraperCache: 3:00 UTC todos os dias, varre ~26 rotas populares
 *    chamando o scraper live. Popula LiveFlightCache com frescor diário,
 *    garantindo que usuários na manhã/tarde peguem cache HIT na busca.
 *
 * 2. cleanupDeadTokens: weekly, remove tokens inativos há >90d (devices
 *    que desinstalaram/trocaram de aparelho — economia de storage + envios
 *    futuros).
 *
 * Cada job é try/catch total — falha de um não derruba os outros.
 * Configuráveis via env (SCHEDULER_ENABLED=false pra desligar em dev).
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushService,
  ) {}

  private isEnabled(): boolean {
    // default: ativo em produção, desligado em dev pra não martelar scraper
    const env = process.env.SCHEDULER_ENABLED;
    if (env === 'true') return true;
    if (env === 'false') return false;
    return process.env.NODE_ENV === 'production';
  }

  /**
   * 3h da manhã (UTC) — pico de baixo tráfego.
   * Chama scraper pra cada rota popular via HTTP interno → cache se popula.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async preWarmScraperCache() {
    if (!this.isEnabled()) {
      this.logger.log('[scheduler disabled] skip preWarmScraperCache');
      return;
    }
    this.logger.log(`Pre-warming cache for ${POPULAR_ROUTES.length} routes...`);

    const scraperUrl =
      process.env.SCRAPER_URL || 'http://localhost:3002';
    const timeoutMs = parseInt(process.env.SCRAPER_TIMEOUT_MS || '20000', 10);

    let ok = 0;
    let failed = 0;

    // Serializado — não queremos derrubar o scraper com 26 calls paralelos.
    // Com 20s timeout cada, pior caso são ~9min; temos a madrugada inteira.
    for (const route of POPULAR_ROUTES) {
      try {
        const tomorrow = new Date(Date.now() + 86400_000);
        const dateStr = tomorrow.toISOString().slice(0, 10);

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);

        const res = await fetch(`${scraperUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: route.origin,
            destination: route.destination,
            departDate: dateStr,
            cabinClass: 'ECONOMY',
            passengers: 1,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          ok++;
        } else {
          failed++;
          this.logger.warn(
            `Pre-warm failed ${route.origin}→${route.destination}: HTTP ${res.status}`,
          );
        }
      } catch (err) {
        failed++;
        this.logger.warn(
          `Pre-warm exception ${route.origin}→${route.destination}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Pre-warm complete: ${ok} ok / ${failed} failed`);
  }

  /**
   * Sunday 4h UTC — limpa tokens de push mortos (>90d sem uso).
   * DeviceNotRegistered já é tratado no envio, isto pega os que nunca
   * responderam mas também não acusaram erro.
   */
  /**
   * Feat 5: Reactivation.
   * Terça 10h UTC (~7h BRT). Identifica usuários inativos 14-28 dias
   * (janela — evita reactivar quem acabou de sair, foco nos "quase perdidos")
   * e manda push com o MAIOR bônus ativo do momento como isca.
   * Quem está inativo >28d é perda já estabelecida — pra esses mandaríamos
   * email (ainda não temos infra) ou nada.
   */
  @Cron('0 10 * * 2') // every Tuesday 10:00 UTC
  async reactivateInactiveUsers() {
    if (!this.isEnabled()) return;

    const now = Date.now();
    const inactiveSince = new Date(now - 14 * 86400_000); // inativo há 14+ dias
    const inactiveCap = new Date(now - 28 * 86400_000); // não pega quem saiu há 28+ dias

    // Usa DeviceToken.lastUsedAt como proxy de atividade (atualizado em cada
    // register do hook usePushNotifications no mobile)
    const inactiveUsers = (await this.prisma.user.findMany({
      where: {
        deviceTokens: {
          some: {
            lastUsedAt: { gte: inactiveCap, lt: inactiveSince },
          },
        },
      } as any,
      select: {
        id: true,
        deviceTokens: {
          where: { lastUsedAt: { gte: inactiveCap, lt: inactiveSince } },
          select: { token: true },
        },
      },
    })) as any[];

    if (inactiveUsers.length === 0) {
      this.logger.log('Reactivation: no inactive users in window');
      return;
    }

    // Pega o bônus mais alto ativo pra usar de isca
    const topBonus = await this.prisma.transferPartnership.findFirst({
      where: { isActive: true, currentBonus: { gt: 0 } },
      orderBy: { currentBonus: 'desc' },
      include: {
        fromProgram: { select: { slug: true, name: true } },
        toProgram: { select: { slug: true, name: true } },
      },
    });

    const title = topBonus
      ? `🎁 ${Math.round(Number(topBonus.currentBonus))}% ${topBonus.fromProgram.name}→${topBonus.toProgram.name}`
      : '👋 Faz tempo que você não abre o app!';
    const body = topBonus
      ? 'Bônus ativo agora. Calcule quanto vale no seu saldo — abre o app.'
      : 'Bônus de transferência novos aparecem toda semana. Vem dar uma olhada.';

    const allTokens: string[] = [];
    for (const u of inactiveUsers) {
      u.deviceTokens?.forEach((d: any) => allTokens.push(d.token));
    }

    if (allTokens.length === 0) return;

    await this.push.sendToTokens(allTokens, {
      title,
      body,
      data: {
        type: 'reactivation',
        partnershipId: topBonus?.id,
        deepLink: topBonus ? '/arbitrage' : '/',
      },
    });

    this.logger.log(
      `Reactivation: ${inactiveUsers.length} user(s), ${allTokens.length} device(s) targeted`,
    );
  }

  @Cron('0 4 * * 0') // every Sunday 04:00
  async cleanupDeadTokens() {
    if (!this.isEnabled()) return;
    const cutoff = new Date(Date.now() - 90 * 86400_000);
    const deleted = await this.prisma.deviceToken.deleteMany({
      where: { lastUsedAt: { lt: cutoff } },
    });
    if (deleted.count > 0) {
      this.logger.log(`Cleanup: removed ${deleted.count} stale device tokens`);
    }
  }
}
