import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

/**
 * Banco de dicas rotativas. Mudam por dia-da-semana pra user não ver a mesma.
 * Expandir com admin console vira feature futura.
 */
const DAILY_TIPS: Array<{ title: string; body: string }> = [
  {
    title: '💡 Dica: Livelo→Smiles é o combo mais usado',
    body: 'Se você tem Itaú ou Bradesco, provavelmente acumula Livelo. Bônus Smiles de 100%+ é o target.',
  },
  {
    title: '📅 Dica: planeje emissão com 90d de antecedência',
    body: 'Taxa menor + disponibilidade maior. Emissão last-minute costuma custar 2-3x mais milhas.',
  },
  {
    title: '✈️ Dica: classe executiva dá o melhor retorno',
    body: 'CPM efetivo em business/first é 2-4x maior que econômica. Se tem milhas sobrando, foque nisso.',
  },
  {
    title: '🔥 Dica: nunca transfira sem bônus de 80%+',
    body: 'Transferência sem bônus = perder CPM. A não ser que seja pra resgatar voo já escolhido.',
  },
  {
    title: '🎯 Dica: monitore 2-3 programas só',
    body: 'Espalhar em 7 programas fragmenta saldo. Foco em 2-3 com parceria forte (ex: Livelo, Smiles, Latam).',
  },
  {
    title: '📊 Dica: CPM varia 30-40% ao longo do ano',
    body: 'Dezembro + Julho = emissão mais cara. Compre pontos em Fev-Mar e Set-Out (CPM historicamente baixo).',
  },
  {
    title: '⏰ Dica: saldo < 5k expirando = transfira mesmo sem bônus',
    body: 'Perder 3k pontos = R$60 jogados fora. Bônus de 50% transformando em 4.5k salva pelo menos.',
  },
];

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

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

    // Mescla rotas hardcoded (estáticas, Brasil-centric) com rotas reais
    // buscadas por users nos últimos 14d (data-driven). Dedup por par O/D.
    const seen = new Set<string>();
    const routes: Array<{ origin: string; destination: string }> = [];
    for (const r of POPULAR_ROUTES) {
      const key = `${r.origin}→${r.destination}`;
      if (!seen.has(key)) { seen.add(key); routes.push(r); }
    }
    try {
      const since = new Date(Date.now() - 14 * 86400_000);
      const dynamic = await (this.prisma as any).searchLog.groupBy({
        by: ['origin', 'destination'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { origin: 'desc' } },
        take: 30,
      });
      for (const d of dynamic) {
        const key = `${d.origin}→${d.destination}`;
        if (!seen.has(key) && d.origin && d.destination) {
          seen.add(key);
          routes.push({ origin: d.origin, destination: d.destination });
        }
      }
      this.logger.log(
        `Pre-warming cache: ${POPULAR_ROUTES.length} hardcoded + ${routes.length - POPULAR_ROUTES.length} data-driven = ${routes.length} total`,
      );
    } catch (err) {
      this.logger.warn(`SearchLog groupBy falhou, usando só rotas hardcoded: ${(err as Error).message}`);
    }

    const scraperUrl =
      process.env.SCRAPER_URL || 'http://localhost:3002';
    const timeoutMs = parseInt(process.env.SCRAPER_TIMEOUT_MS || '20000', 10);

    let ok = 0;
    let failed = 0;

    // Serializado — não queremos derrubar o scraper com 26 calls paralelos.
    // Com 20s timeout cada, pior caso são ~9min; temos a madrugada inteira.
    for (const route of routes) {
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
   *
   * Dedup: só considera saldos com lastExpirationAlertAt null ou >7d atrás.
   * Evita spam diário idêntico até o vencimento real. Após enviar, atualiza
   * o timestamp em todos os saldos que compuseram o push (não só o nearest).
   */
  @Cron('0 8 * * *')
  async pointsExpirationAlert() {
    if (!this.isEnabled()) return;
    try {
      const now = Date.now();
      const soonFrom = new Date(now + 7 * 86400_000);
      const soonTo = new Date(now + 45 * 86400_000);
      const alertCutoff = new Date(now - 7 * 86400_000); // só re-alerta após 7d

      const expiring = await this.prisma.userMilesBalance.findMany({
        where: {
          expiresAt: { gte: soonFrom, lte: soonTo },
          balance: { gt: 0 },
          OR: [
            { lastExpirationAlertAt: null },
            { lastExpirationAlertAt: { lt: alertCutoff } },
          ],
        } as any,
        include: { program: { select: { name: true } } },
      });

      if (expiring.length === 0) {
        this.logger.log('Expiration alert: nenhum saldo novo pra alertar (todos já notificados nos últimos 7d)');
        return;
      }

      const byUser = new Map<string, typeof expiring>();
      for (const b of expiring) {
        const arr = byUser.get(b.userId) || [];
        arr.push(b);
        byUser.set(b.userId, arr);
      }

      let sent = 0;
      const alertedBalanceIds: string[] = [];
      for (const [userId, balances] of byUser) {
        const devices = await this.prisma.deviceToken.findMany({
          where: {
            userId,
            lastUsedAt: { gte: new Date(now - 60 * 86400_000) },
          },
          select: { token: true },
        });
        if (devices.length === 0) continue;

        const nearest = balances
          .slice()
          .sort((a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0))[0];
        const daysLeft = Math.ceil(
          ((nearest.expiresAt?.getTime() ?? now) - now) / 86400_000,
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
        if (result.sent > 0) {
          sent++;
          for (const b of balances) alertedBalanceIds.push(b.id);
        }
      }

      if (alertedBalanceIds.length > 0) {
        await this.prisma.userMilesBalance.updateMany({
          where: { id: { in: alertedBalanceIds } },
          data: { lastExpirationAlertAt: new Date() } as any,
        });
      }

      this.logger.log(
        `Expiration alert: ${byUser.size} users com saldo expirando, ${sent} pushes entregues, ${alertedBalanceIds.length} saldos marcados`,
      );
    } catch (err) {
      this.logger.error(`Expiration alert failed: ${(err as Error).message}`);
    }
  }


  /**
   * Wallet snapshots diários — captura 4h UTC (~1h BRT, baixo tráfego).
   * Pega user com device ativo nos últimos 7d → snapshot.
   * Chama diretamente o Prisma (evita circular dep com WalletHistoryModule
   * que depende do PrismaModule já importado aqui).
   */
  @Cron('0 4 * * *')
  async captureWalletSnapshots() {
    if (!this.isEnabled()) return;
    try {
      const since = new Date(Date.now() - 7 * 86400_000);
      const activeUsers = await this.prisma.user.findMany({
        where: {
          deviceTokens: { some: { lastUsedAt: { gte: since } } },
        },
        select: { id: true },
        take: 5000,
      });

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      let ok = 0;
      let fail = 0;
      for (const u of activeUsers) {
        try {
          const balances = await this.prisma.userMilesBalance.findMany({
            where: { userId: u.id },
            include: { program: true },
          });
          const totalMiles = balances.reduce((s, b) => s + b.balance, 0);
          const totalValueBrl = balances.reduce(
            (s, b) => s + (b.balance / 1000) * (b.program.avgCpmCurrent || 25),
            0,
          );
          const breakdown = balances.map((b) => ({
            slug: b.program.slug,
            balance: b.balance,
            valueBrl: (b.balance / 1000) * (b.program.avgCpmCurrent || 25),
          }));
          await (this.prisma as any).walletSnapshot.upsert({
            where: { userId_date: { userId: u.id, date: today } },
            create: {
              userId: u.id,
              date: today,
              totalMiles,
              totalValueBrl,
              programsCount: balances.length,
              breakdown: JSON.stringify(breakdown),
            },
            update: {
              totalMiles,
              totalValueBrl,
              programsCount: balances.length,
              breakdown: JSON.stringify(breakdown),
            },
          });
          ok++;
        } catch {
          fail++;
        }
      }
      this.logger.log(`Wallet snapshots: ${ok} ok / ${fail} fail de ${activeUsers.length} users ativos`);
    } catch (err) {
      this.logger.error(`Wallet snapshot cron failed: ${(err as Error).message}`);
    }
  }

  /**
   * Reminders de notas pessoais — roda a cada 5min. Busca user_notes com
   * remindAt <= now() AND remindSent=false AND isArchived=false, dispara
   * push + marca remindSent=true.
   *
   * Recurring: se note.recurrence != NONE, re-arma remindAt pro próximo
   * ciclo em vez de apenas marcar sent.
   *   DAILY   → +24h
   *   WEEKLY  → +7d
   *   MONTHLY → +30d (aproximação, suficiente pra reminders)
   */
  @Cron('*/5 * * * *')
  async sendNoteReminders() {
    if (!this.isEnabled()) return;
    try {
      const now = new Date();
      const notes = await (this.prisma as any).userNote.findMany({
        where: {
          remindAt: { lte: now },
          remindSent: false,
          isArchived: false,
        },
        take: 100,
      });
      if (notes.length === 0) return;

      let sent = 0;
      for (const note of notes) {
        const devices = await this.prisma.deviceToken.findMany({
          where: {
            userId: note.userId,
            lastUsedAt: { gte: new Date(Date.now() - 60 * 86400_000) },
          },
          select: { token: true },
        });
        if (devices.length > 0) {
          try {
            await this.push.sendToTokens(
              devices.map((d) => d.token),
              {
                title: `📝 Lembrete: ${note.title}`,
                body: note.body.slice(0, 200),
                data: { type: 'note_reminder', noteId: note.id },
              },
            );
            sent++;
          } catch {
            /* continua */
          }
        }

        // Recurring: re-arma em vez de marcar sent
        const recurrence = (note as any).recurrence ?? 'NONE';
        if (recurrence !== 'NONE' && note.remindAt) {
          const base = new Date(note.remindAt).getTime();
          let nextMs = base;
          if (recurrence === 'DAILY') nextMs = base + 86400_000;
          else if (recurrence === 'WEEKLY') nextMs = base + 7 * 86400_000;
          else if (recurrence === 'MONTHLY') nextMs = base + 30 * 86400_000;
          // Garantir que nextMs é >= agora (se note antiga, pula p/ próximo ciclo)
          while (nextMs < Date.now()) {
            if (recurrence === 'DAILY') nextMs += 86400_000;
            else if (recurrence === 'WEEKLY') nextMs += 7 * 86400_000;
            else nextMs += 30 * 86400_000;
          }
          await (this.prisma as any).userNote.update({
            where: { id: note.id },
            data: { remindAt: new Date(nextMs), remindSent: false },
          });
        } else {
          await (this.prisma as any).userNote.update({
            where: { id: note.id },
            data: { remindSent: true },
          });
        }
      }
      this.logger.log(`Note reminders: ${notes.length} processados, ${sent} pushes enviados`);
    } catch (err) {
      this.logger.error(`Note reminders failed: ${(err as Error).message}`);
    }
  }

  /**
   * Dica do dia — terça, quinta e sábado às 18h UTC (~15h BRT).
   * Só envia pra users com notifyBonus=true e último device ativo nos últimos
   * 30 dias. Escolhe tip do array DAILY_TIPS por modulo do dia-do-ano.
   */
  @Cron('0 18 * * 2,4,6')
  async sendDailyTip() {
    if (!this.isEnabled()) return;
    if ((process.env.DAILY_TIP_ENABLED || 'true').toLowerCase() === 'false') return;

    try {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400_000,
      );
      const tip = DAILY_TIPS[dayOfYear % DAILY_TIPS.length];

      // Só users com preferência de notificação ligada + device recente
      const users = await this.prisma.user.findMany({
        where: {
          preferences: { notifyBonus: true },
          deviceTokens: {
            some: { lastUsedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
          },
        },
        select: {
          id: true,
          deviceTokens: {
            where: { lastUsedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
            select: { token: true },
          },
        },
      });

      let sent = 0;
      for (const u of users) {
        const tokens = u.deviceTokens.map((d) => d.token);
        if (tokens.length === 0) continue;
        try {
          await this.push.sendToTokens(tokens, {
            title: tip.title,
            body: tip.body,
            data: { type: 'daily_tip', deepLink: '/arbitrage' },
          });
          sent++;
        } catch {
          /* continua pros outros */
        }
      }
      this.logger.log(`Daily tip enviado pra ${sent}/${users.length} users`);
    } catch (err) {
      this.logger.error(`Daily tip failed: ${(err as Error).message}`);
    }
  }

  /**
   * Reset mensal de quota de API keys. Roda dia 1 de cada mês às 0h UTC.
   * Zera requestsThisMonth pra todas keys ativas — ciclo de billing novo.
   *
   * Bug fix do HONEST_TEST_REPORT.md (#3): sem isso quota nunca reseta,
   * users free estouram permanentemente.
   */
  @Cron('0 0 1 * *')
  async resetApiKeyMonthlyQuota() {
    if (!this.isEnabled()) return;
    try {
      const result = await (this.prisma as any).apiKey.updateMany({
        where: { isActive: true },
        data: { requestsThisMonth: 0 },
      });
      this.logger.log(`API keys quota reset: ${result.count} keys resetadas`);
    } catch (err) {
      this.logger.error(`API key quota reset failed: ${(err as Error).message}`);
    }
  }

  /**
   * Avaliação de alertas personalizados — roda a cada 30 min.
   *
   * Para cada alert ativo do user:
   *   - BONUS_THRESHOLD: checa se existe TransferPartnership ativo com
   *     currentBonus >= threshold. Se sim, dispara push.
   *   - CPM_THRESHOLD:   checa se existe Offer recente (últimos 7d, ativa)
   *     com cpm <= threshold.
   *   - DESTINATION:     checa AwardChart OU LiveFlightCache FRESH pra rota
   *     alvo.
   *
   * Dedup: lastTriggeredAt no Alert — se disparou nas últimas 12h, pula.
   */
  @Cron('*/30 * * * *')
  async evaluateAlerts() {
    if (!this.isEnabled()) return;
    try {
      const now = Date.now();
      const twelveHoursAgo = new Date(now - 12 * 3600 * 1000);

      const alerts = await this.prisma.alert.findMany({
        where: {
          isActive: true,
          OR: [{ lastTriggeredAt: null }, { lastTriggeredAt: { lt: twelveHoursAgo } }],
        },
      });

      if (alerts.length === 0) return;

      let triggered = 0;
      for (const a of alerts) {
        const conditions = typeof a.conditions === 'string' ? safeJson(a.conditions) : (a.conditions as any);
        let match: { title: string; body: string; deepLink: string; data: any } | null = null;

        if (a.type === 'BONUS_THRESHOLD') {
          const min = Number(conditions?.minBonus ?? conditions?.bonusPercent ?? 50);
          const match_ = await this.prisma.transferPartnership.findFirst({
            where: { isActive: true, currentBonus: { gte: min } },
            orderBy: { currentBonus: 'desc' },
            include: { fromProgram: true, toProgram: true },
          });
          if (match_) {
            match = {
              title: `🎁 Bônus ${Math.round(Number(match_.currentBonus))}% ativo!`,
              body: `${match_.fromProgram.name} → ${match_.toProgram.name}. Configurado pelo seu alerta.`,
              deepLink: '/arbitrage',
              data: { partnershipId: match_.id, alertId: a.id },
            };
          }
        } else if (a.type === 'CPM_THRESHOLD') {
          const maxCpm = Number(conditions?.maxCpm ?? conditions?.targetCpm ?? 20);
          const sevenDaysAgo = new Date(now - 7 * 86400_000);
          const offer = await this.prisma.offer.findFirst({
            where: {
              isActive: true,
              isDeleted: false,
              cpm: { lte: maxCpm },
              createdAt: { gte: sevenDaysAgo },
            },
            orderBy: { cpm: 'asc' },
            include: { program: true },
          });
          if (offer) {
            match = {
              title: `💰 Oferta abaixo do seu CPM alvo!`,
              body: `${offer.title} · CPM R$${Number(offer.cpm).toFixed(2)}`,
              deepLink: `/offer/${offer.id}`,
              data: { offerId: offer.id, alertId: a.id },
            };
          }
        } else if (a.type === 'DESTINATION') {
          const origin = String(conditions?.origin ?? '').toUpperCase();
          const destination = String(conditions?.destination ?? '').toUpperCase();
          if (origin && destination) {
            const chart = await this.prisma.awardChart.findFirst({
              where: { origin, destination, isActive: true },
              orderBy: { milesRequired: 'asc' },
              include: { program: true },
            });
            if (chart) {
              match = {
                title: `✈️ Rota ${origin}→${destination} disponível!`,
                body: `${chart.program.name}: ${chart.milesRequired.toLocaleString('pt-BR')} milhas. Configurado pelo seu alerta.`,
                deepLink: '/arbitrage',
                data: { chartId: chart.id, alertId: a.id },
              };
            }
          }
        }

        if (!match) continue;

        // Envia push (via PushService) + grava AlertHistory + atualiza lastTriggeredAt
        const devices = await this.prisma.deviceToken.findMany({
          where: {
            userId: a.userId,
            lastUsedAt: { gte: new Date(now - 60 * 86400_000) },
          },
          select: { token: true },
        });
        if (devices.length === 0) continue;

        await this.push.sendToTokens(
          devices.map((d) => d.token),
          {
            title: match.title,
            body: match.body,
            data: { type: 'alert_match', deepLink: match.deepLink, ...match.data },
          },
        );
        await this.prisma.alertHistory.create({
          data: {
            alertId: a.id,
            offerId: match.data.offerId ?? null,
            channel: 'push',
          },
        });
        await this.prisma.alert.update({
          where: { id: a.id },
          data: { lastTriggeredAt: new Date() },
        });
        triggered++;
      }

      this.logger.log(`evaluateAlerts: ${alerts.length} avaliados, ${triggered} disparados`);
    } catch (err) {
      this.logger.error(`evaluateAlerts failed: ${(err as Error).message}`);
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
