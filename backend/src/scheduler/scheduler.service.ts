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

  /**
   * Feat A: Expiração de bônus.
   * Diário 5h UTC: desativa TransferPartnerships cujo expiresAt passou.
   * Sem isso, usuário vê "+100% Livelo→Smiles" e transfere, mas bônus já
   * acabou ontem → perde dinheiro real. Risco user-facing grave.
   */
  @Cron('0 5 * * *')
  async expireBonuses() {
    if (!this.isEnabled()) return;
    const now = new Date();
    const result = await this.prisma.transferPartnership.updateMany({
      where: {
        isActive: true,
        expiresAt: { not: null, lt: now },
      },
      data: { isActive: false, currentBonus: 0 },
    });
    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} transfer partnerships`);
    }
  }

  /**
   * Feat E: Digest semanal.
   * Sexta 10h UTC (~7h BRT): resumo de bônus aprovados na semana pra
   * re-engajar user que não abriu o app. Inclui contagem + maior bônus
   * da semana como isca.
   */
  @Cron('0 10 * * 5')
  async sendWeeklyDigest() {
    if (!this.isEnabled()) return;

    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const approvedThisWeek = await this.prisma.bonusReport.findMany({
      where: {
        status: 'APPROVED',
        reviewedAt: { gte: weekAgo },
      },
      orderBy: { bonusPercent: 'desc' },
    });

    if (approvedThisWeek.length === 0) {
      this.logger.log('Digest: nothing approved this week, skipping');
      return;
    }

    const biggest = approvedThisWeek[0];
    const title = `📬 ${approvedThisWeek.length} bônus${approvedThisWeek.length > 1 ? 's' : ''} essa semana`;
    const body = `Destaque: +${Math.round(biggest.bonusPercent)}% ${biggest.fromProgramSlug}→${biggest.toProgramSlug}. Calcule o valor na sua carteira.`;

    // Send to all active devices
    const cutoff = new Date(Date.now() - 30 * 86400_000);
    const devices = await this.prisma.deviceToken.findMany({
      where: { lastUsedAt: { gte: cutoff } },
      select: { token: true },
    });
    if (devices.length === 0) return;

    await this.push.sendToTokens(
      devices.map((d) => d.token),
      {
        title,
        body,
        data: { type: 'weekly_digest', deepLink: '/arbitrage' },
      },
    );
    this.logger.log(
      `Weekly digest sent: ${approvedThisWeek.length} bonuses to ${devices.length} devices`,
    );
  }

  /**
   * Alerta de expiração de pontos — diário 8h UTC (~5h BRT).
   * Busca UserMilesBalance com expiresAt entre 7d-45d à frente + balance>0.
   * Agrupa por user → 1 push por user mesmo com múltiplos saldos expirando.
   */
  @Cron('0 8 * * *')
  async pointsExpirationAlert() {
    if (!this.isEnabled()) return;
    try {
      const soonFrom = new Date(Date.now() + 7 * 86400_000);
      const soonTo = new Date(Date.now() + 45 * 86400_000);

      const expiring = await this.prisma.userMilesBalance.findMany({
        where: {
          expiresAt: { gte: soonFrom, lte: soonTo },
          balance: { gt: 0 },
        },
        include: { program: { select: { name: true } } },
      });

      if (expiring.length === 0) return;

      const byUser = new Map<string, typeof expiring>();
      for (const b of expiring) {
        const arr = byUser.get(b.userId) || [];
        arr.push(b);
        byUser.set(b.userId, arr);
      }

      let sent = 0;
      for (const [userId, balances] of byUser) {
        const devices = await this.prisma.deviceToken.findMany({
          where: {
            userId,
            lastUsedAt: { gte: new Date(Date.now() - 60 * 86400_000) },
          },
          select: { token: true },
        });
        if (devices.length === 0) continue;

        const nearest = balances
          .slice()
          .sort((a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0))[0];
        const daysLeft = Math.ceil(
          ((nearest.expiresAt?.getTime() ?? Date.now()) - Date.now()) / 86400_000,
        );
        const totalPoints = balances.reduce((s, b) => s + b.balance, 0);

        const title =
          balances.length === 1
            ? `⏰ Seus pontos ${nearest.program.name} expiram em ${daysLeft}d`
            : `⏰ ${balances.length} saldos seus expirando em breve`;
        const body = `${totalPoints.toLocaleString('pt-BR')} pontos totais — transfira agora pra não perder.`;

        const result = await this.push.sendToTokens(
          devices.map((d) => d.token),
          {
            title,
            body,
            data: { type: 'points_expiring', deepLink: '/arbitrage', daysLeft, totalPoints },
          },
        );
        if (result.sent > 0) sent++;
      }

      this.logger.log(
        `Expiration alert: ${byUser.size} users com saldo expirando, ${sent} pushes entregues`,
      );
    } catch (err) {
      this.logger.error(`Expiration alert failed: ${(err as Error).message}`);
    }
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

  /**
   * Cleanup LiveFlightCache — remove entries staler que 30d.
   * Supabase free 500MB limit; melhor manter enxuto. Cache STALE (24h-7d)
   * ainda vira REFERENCIA útil, mas >30d só ocupa espaço.
   * Domingo 3h UTC junto com outros cleanups.
   */
  @Cron('0 3 * * 0')
  async cleanupOldFlightCache() {
    if (!this.isEnabled()) return;
    try {
      const cutoff = new Date(Date.now() - 30 * 86400_000);
      const result = await (this.prisma as any).liveFlightCache.deleteMany({
        where: { fetchedAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(
          `LiveFlightCache cleanup: removed ${result.count} entries older than 30d`,
        );
      }
    } catch (err) {
      this.logger.error(`FlightCache cleanup failed: ${(err as Error).message}`);
    }
  }

  /**
   * Snapshot diário 6h UTC — grava counts de tabelas chave como AuditLog.
   * Útil pra detectar data loss: se amanhã User.count dropa de 500 pra 30,
   * temos evidência histórica. Supabase já faz backup físico, isso é
   * canary verification complementar.
   */
  @Cron('0 6 * * *')
  async snapshotDataCounts() {
    if (!this.isEnabled()) return;
    try {
      const [users, reports, partnerships, offers, devices] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.bonusReport.count(),
        this.prisma.transferPartnership.count(),
        this.prisma.offer.count({ where: { isDeleted: false } }),
        this.prisma.deviceToken.count(),
      ]);
      const firstAdmin = await this.prisma.user.findFirst({ where: { isAdmin: true } });
      if (!firstAdmin) return;
      await this.prisma.auditLog.create({
        data: {
          adminId: firstAdmin.id,
          action: 'SNAPSHOT',
          entityType: 'database',
          after: JSON.stringify({
            users,
            bonusReports: reports,
            transferPartnerships: partnerships,
            activeOffers: offers,
            deviceTokens: devices,
            at: new Date().toISOString(),
          }),
        },
      });
      this.logger.log(
        `Snapshot: ${users}u / ${reports}r / ${partnerships}p / ${offers}o / ${devices}d`,
      );
    } catch (err) {
      this.logger.error(`Snapshot failed: ${(err as Error).message}`);
    }
  }
}
