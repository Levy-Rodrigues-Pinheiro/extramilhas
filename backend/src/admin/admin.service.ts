import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OfferClassification, SubscriptionPlan } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/dto/pagination.dto';
import { ContentService, CreateArticleDto, UpdateArticleDto } from '../content/content.service';
import { PushService } from '../push/push.service';

function csvEscape(s: string | null | undefined): string {
  if (!s) return '';
  // Se tem vírgula, aspas ou newline, cerca com aspas e escapa aspas internas
  if (/[,"\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function classifyFromCpm(cpm: number): OfferClassification {
  if (cpm < 20) return OfferClassification.IMPERDIVEL;
  if (cpm <= 30) return OfferClassification.BOA;
  return OfferClassification.NORMAL;
}

function classificationLabel(c: string): string {
  if (c === 'IMPERDIVEL') return '🔥 imperdível';
  if (c === 'BOA') return '⚡ boa oferta';
  return 'oferta';
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private contentService: ContentService,
    private push: PushService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Broadcast avançado com segmentação. Supporta combinar filtros:
   *   - plans: ['PREMIUM', 'PRO']
   *   - minStreak: 7 (só users com streak >= 7d)
   *   - hasBalance: true (só users com algum saldo cadastrado)
   *   - maxDaysSinceLastActive: 14
   *
   * Dry run retorna apenas count do segment sem mandar push.
   */
  async broadcastAdvanced(params: {
    title: string;
    body: string;
    deepLink?: string;
    segments: {
      plans?: string[];
      minStreak?: number;
      hasBalance?: boolean;
      maxDaysSinceLastActive?: number;
    };
    dryRun?: boolean;
  }) {
    const where: any = {};

    if (params.segments.plans && params.segments.plans.length > 0) {
      where.subscriptionPlan = { in: params.segments.plans };
    }

    if (params.segments.maxDaysSinceLastActive !== undefined) {
      const cutoff = new Date(
        Date.now() - params.segments.maxDaysSinceLastActive * 86400_000,
      );
      where.deviceTokens = { some: { lastUsedAt: { gte: cutoff } } };
    } else {
      where.deviceTokens = { some: {} };
    }

    // Streak filter + hasBalance são filtros post-query (schema não suporta
    // direto via where. Filtramos em memória após findMany)
    const candidates = (await (this.prisma.user as any).findMany({
      where,
      select: {
        id: true,
        deviceTokens: { select: { token: true, lastUsedAt: true } },
      },
      take: 10000,
    })) as Array<{ id: string; deviceTokens: Array<{ token: string; lastUsedAt: Date }> }>;

    let filtered = candidates;

    if (params.segments.minStreak !== undefined) {
      const streaks = (await (this.prisma as any).userStreak.findMany({
        where: {
          userId: { in: candidates.map((c) => c.id) },
          currentStreak: { gte: params.segments.minStreak },
        },
        select: { userId: true },
      })) as Array<{ userId: string }>;
      const streakSet = new Set(streaks.map((s) => s.userId));
      filtered = filtered.filter((c) => streakSet.has(c.id));
    }

    if (params.segments.hasBalance === true) {
      const withBalance = (await this.prisma.userMilesBalance.findMany({
        where: {
          userId: { in: filtered.map((c) => c.id) },
          balance: { gt: 0 },
        },
        distinct: ['userId'],
        select: { userId: true },
      })) as Array<{ userId: string }>;
      const balanceSet = new Set(withBalance.map((b) => b.userId));
      filtered = filtered.filter((c) => balanceSet.has(c.id));
    }

    const targetUsers = filtered.length;

    if (params.dryRun) {
      return { dryRun: true, targetUsers };
    }

    let sentCount = 0;
    for (const u of filtered) {
      const tokens = u.deviceTokens.map((d) => d.token);
      if (tokens.length === 0) continue;
      try {
        await this.push.sendToTokens(tokens, {
          title: params.title,
          body: params.body,
          data: {
            type: 'admin_broadcast',
            deepLink: params.deepLink ?? '/',
          },
        });
        sentCount++;
      } catch {
        /* continua */
      }
    }

    return { dryRun: false, targetUsers, sent: sentCount };
  }

  /**
   * Retenção por coorte semanal — D1/D7/D30.
   * Coorte = users registrados na semana X. Métrica = % deles com atividade
   * (lastActiveAt) no dia 1, 7, 30 após o registro.
   * Últimas 8 semanas pra dashboard.
   */
  async getCohortRetention() {
    const now = Date.now();
    const weekMs = 7 * 86400_000;
    const cohorts: Array<{
      weekStart: string;
      totalUsers: number;
      d1Retention: number;
      d7Retention: number;
      d30Retention: number;
    }> = [];

    for (let i = 8; i >= 1; i--) {
      const weekStart = new Date(now - i * weekMs);
      const weekEnd = new Date(weekStart.getTime() + weekMs);

      const users = (await (this.prisma.user as any).findMany({
        where: { createdAt: { gte: weekStart, lt: weekEnd } },
        select: { id: true, createdAt: true, lastActiveAt: true },
      })) as Array<{ id: string; createdAt: Date; lastActiveAt: Date | null }>;

      const total = users.length;
      if (total === 0) {
        cohorts.push({
          weekStart: weekStart.toISOString().slice(0, 10),
          totalUsers: 0,
          d1Retention: 0,
          d7Retention: 0,
          d30Retention: 0,
        });
        continue;
      }

      const countAfter = (days: number) => {
        return users.filter((u) => {
          if (!u.lastActiveAt) return false;
          // Safe — lastActiveAt pode vir como string de JSON ou Date de Prisma.
          const lastActiveMs =
            typeof u.lastActiveAt === 'string'
              ? new Date(u.lastActiveAt).getTime()
              : u.lastActiveAt.getTime?.() ?? 0;
          const createdMs =
            typeof u.createdAt === 'string'
              ? new Date(u.createdAt as any).getTime()
              : u.createdAt.getTime?.() ?? 0;
          if (!lastActiveMs || !createdMs) return false;
          const delta = lastActiveMs - createdMs;
          return delta >= days * 86400_000;
        }).length;
      };

      cohorts.push({
        weekStart: weekStart.toISOString().slice(0, 10),
        totalUsers: total,
        d1Retention: Math.round((countAfter(1) / total) * 1000) / 10,
        d7Retention: Math.round((countAfter(7) / total) * 1000) / 10,
        d30Retention: Math.round((countAfter(30) / total) * 1000) / 10,
      });
    }

    return { cohorts };
  }

  /**
   * LTV estimate por plano. Simplificado:
   *   - PREMIUM mensal: R$ 19.90/mês * média de meses ativos
   *   - PRO mensal: R$ 39.90/mês * média de meses ativos
   *   - FREE: 0 (ou indireto via trial→conversão, não medido aqui)
   *
   * Base de meses ativos = (now - createdAt) / 30d pra users com subscriptionPlan != FREE.
   * Isso é um proxy fraco — LTV real requer tracking de transactions Stripe.
   */
  async getLtvEstimate() {
    const now = Date.now();
    const PRICING: Record<string, number> = { FREE: 0, PREMIUM: 19.9, PRO: 39.9 };

    const users = await this.prisma.user.findMany({
      select: { id: true, subscriptionPlan: true, createdAt: true },
    });

    const byPlan: Record<
      string,
      { count: number; totalRevenue: number; avgMonthsActive: number }
    > = {};

    for (const plan of ['FREE', 'PREMIUM', 'PRO']) {
      const group = users.filter((u) => u.subscriptionPlan === plan);
      const months = group.map((u) => (now - u.createdAt.getTime()) / (30 * 86400_000));
      const avgMonths =
        months.length > 0 ? months.reduce((s, m) => s + m, 0) / months.length : 0;
      const totalRev = group.length * avgMonths * PRICING[plan];
      byPlan[plan] = {
        count: group.length,
        totalRevenue: Math.round(totalRev * 100) / 100,
        avgMonthsActive: Math.round(avgMonths * 10) / 10,
      };
    }

    const totalUsers = users.length;
    const totalRevenue = Object.values(byPlan).reduce((s, p) => s + p.totalRevenue, 0);
    return {
      byPlan,
      totalUsers,
      totalEstimatedRevenue: Math.round(totalRevenue * 100) / 100,
      avgLtv:
        totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0,
      note: 'Estimativa baseada em subscriptionPlan atual × meses desde signup × tabela fixa. Stripe real não conectado (infra pronta).',
    };
  }

  /**
   * Admin impersonação — gera JWT curto (30 min) no contexto do user-alvo
   * com flag `impersonatedBy=adminId` no payload pra auditoria. Grava
   * AuditLog. Uso: debug de bug específico do user, suporte white-glove.
   *
   * SEGURANÇA: não devolve refreshToken (admin não fica logado como user).
   */
  async impersonateUser(targetUserId: string, adminId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User não encontrado');
    // Security fix: admin não pode impersonar outro admin. Previne 2FA
    // bypass de admin suspendido via admin hostil.
    if (target.isAdmin) {
      throw new ForbiddenException('Não é possível impersonar outros admins');
    }
    // Auto-impersonation também bloqueada (abuse de audit log)
    if (target.id === adminId) {
      throw new ForbiddenException('Não faz sentido impersonar a si mesmo');
    }
    const accessToken = await this.jwtService.signAsync(
      {
        sub: target.id,
        email: target.email,
        isAdmin: false, // força não-admin no token impersonated, evita escalation
        plan: target.subscriptionPlan,
        impersonatedBy: adminId,
      },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '30m',
      },
    );
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'IMPERSONATE',
        entityType: 'user',
        entityId: target.id,
        after: JSON.stringify({ targetEmail: target.email, expiresIn: '30m' }),
      },
    });
    return {
      accessToken,
      targetUserId: target.id,
      targetEmail: target.email,
      expiresInMs: 30 * 60 * 1000,
    };
  }

  /**
   * Exporta AuditLog completo como CSV. Usado em auditorias LGPD/SOC.
   * Limita a últimos 12 meses pra não explodir payload.
   */
  async exportAuditLogCsv() {
    const cutoff = new Date(Date.now() - 365 * 86400_000);
    const logs = await this.prisma.auditLog.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
    });
    const lines = ['id,adminId,action,entityType,entityId,createdAt,after'];
    for (const l of logs) {
      lines.push(
        [
          l.id,
          l.adminId,
          l.action,
          l.entityType,
          l.entityId ?? '',
          l.createdAt.toISOString(),
          csvEscape(l.after ?? ''),
        ].join(','),
      );
    }
    return {
      csv: lines.join('\n'),
      filename: `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      rowCount: logs.length,
    };
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboardMetrics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const monthAgo = new Date(Date.now() - 30 * 86400_000);

    // Agrupo as queries por responsabilidade pra facilitar manutenção —
    // o Promise.all faz tudo em paralelo então o custo é ~1 round-trip.
    const [
      // Usuários e assinantes (legados)
      totalUsers,
      activeSubscribers,
      premiumCount,
      proCount,
      totalActiveOffers,
      alertsTriggeredToday,
      recentOffers,
      recentUsers,
      // Growth
      newUsersThisWeek,
      newUsersThisMonth,
      // Crowdsource (BonusReport)
      reportsPending,
      reportsApprovedThisMonth,
      reportsAllTime,
      // Engagement (DeviceToken)
      devicesTotal,
      devicesActive30d,
      devicesActive7d,
      devicesByPlatform,
      // Reporters top 5 (leaderboard compacto)
      topReportersGrouped,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { subscriptionPlan: { not: SubscriptionPlan.FREE } } }),
      this.prisma.user.count({ where: { subscriptionPlan: SubscriptionPlan.PREMIUM } }),
      this.prisma.user.count({ where: { subscriptionPlan: SubscriptionPlan.PRO } }),
      this.prisma.offer.count({ where: { isActive: true, isDeleted: false } }),
      this.prisma.alertHistory.count({ where: { sentAt: { gte: todayStart } } }),
      this.prisma.offer.findMany({
        where: { isDeleted: false },
        include: { program: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, subscriptionPlan: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.bonusReport.count({ where: { status: 'PENDING' } }),
      this.prisma.bonusReport.count({
        where: { status: 'APPROVED', createdAt: { gte: monthAgo } },
      }),
      this.prisma.bonusReport.count(),
      this.prisma.deviceToken.count(),
      this.prisma.deviceToken.count({ where: { lastUsedAt: { gte: monthAgo } } }),
      this.prisma.deviceToken.count({ where: { lastUsedAt: { gte: weekAgo } } }),
      this.prisma.deviceToken.groupBy({
        by: ['platform'],
        _count: { _all: true },
      }),
      this.prisma.bonusReport.groupBy({
        by: ['reporterId'],
        where: { status: 'APPROVED', reporterId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { reporterId: 'desc' } },
        take: 5,
      }),
    ]);

    // Resolve os nomes dos top reporters
    const topReporterIds = topReportersGrouped.map((g) => g.reporterId!).filter(Boolean);
    const topReporterUsers = topReporterIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: topReporterIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userById = new Map(topReporterUsers.map((u) => [u.id, u]));
    const topReporters = topReportersGrouped.map((g) => ({
      userId: g.reporterId!,
      name: userById.get(g.reporterId!)?.name ?? 'Desconhecido',
      email: userById.get(g.reporterId!)?.email ?? '',
      approvedCount: g._count._all,
    }));

    // Conversão crowd→paid: % de usuários que reportaram E pagam
    const reportersTotal = await this.prisma.bonusReport.findMany({
      where: { reporterId: { not: null } },
      select: { reporterId: true },
      distinct: ['reporterId'],
    });
    const reportersUserIds = reportersTotal.map((r) => r.reporterId!).filter(Boolean);
    const reportersPaidCount = reportersUserIds.length
      ? await this.prisma.user.count({
          where: {
            id: { in: reportersUserIds },
            subscriptionPlan: { not: SubscriptionPlan.FREE },
          },
        })
      : 0;

    return {
      // ── Legado ─────────────────────
      totalUsers,
      activeSubscribers,
      premiumCount,
      proCount,
      totalActiveOffers,
      alertsTriggeredToday,
      recentOffers,
      recentUsers,
      // ── Growth ─────────────────────
      growth: {
        newUsersThisWeek,
        newUsersThisMonth,
        conversionRate:
          totalUsers > 0
            ? parseFloat(((activeSubscribers / totalUsers) * 100).toFixed(2))
            : 0,
      },
      // ── Crowdsource ────────────────
      crowdsource: {
        reportsPending,
        reportsApprovedThisMonth,
        reportsAllTime,
        uniqueReporters: reportersUserIds.length,
        reportersPaidCount,
        reporterToPaidRate:
          reportersUserIds.length > 0
            ? parseFloat(((reportersPaidCount / reportersUserIds.length) * 100).toFixed(2))
            : 0,
        topReporters,
      },
      // ── Push notifications ─────────
      push: {
        devicesTotal,
        devicesActive30d,
        devicesActive7d,
        byPlatform: devicesByPlatform.map((p) => ({
          platform: p.platform,
          count: p._count._all,
        })),
      },
    };
  }

  // ─── Audit Logs ──────────────────────────────────────────────────────────

  async listAuditLogs(limit = 50, action?: string) {
    return this.prisma.auditLog.findMany({
      where: action ? { action } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { admin: { select: { name: true, email: true } } },
    });
  }

  // ─── Debug / Snapshots ───────────────────────────────────────────────────

  async listRecentSnapshots(limit = 30) {
    const logs = await this.prisma.auditLog.findMany({
      where: { action: 'SNAPSHOT', entityType: 'database' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs.map((l) => {
      let parsed: any = null;
      try {
        parsed = l.after ? JSON.parse(l.after) : null;
      } catch {}
      return {
        id: l.id,
        createdAt: l.createdAt,
        data: parsed,
      };
    });
  }

  // ─── CSV exports ─────────────────────────────────────────────────────────

  async exportUsersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        lastActiveAt: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    });
    const lines = [
      'id,email,name,plan,expiresAt,createdAt,lastActiveAt',
      ...users.map((u: any) =>
        [
          u.id,
          csvEscape(u.email),
          csvEscape(u.name),
          u.subscriptionPlan,
          u.subscriptionExpiresAt?.toISOString() ?? '',
          u.createdAt?.toISOString() ?? '',
          u.lastActiveAt?.toISOString?.() ?? '',
        ].join(','),
      ),
    ];
    return lines.join('\n');
  }

  async exportPartnershipsCsv(): Promise<string> {
    const rows = await this.prisma.transferPartnership.findMany({
      where: { isActive: true },
      include: {
        fromProgram: { select: { slug: true, name: true } },
        toProgram: { select: { slug: true, name: true } },
      },
      orderBy: { currentBonus: 'desc' },
    });
    const lines = [
      'fromSlug,fromName,toSlug,toName,baseRate,currentBonus,expiresAt',
      ...rows.map((p: any) =>
        [
          p.fromProgram.slug,
          csvEscape(p.fromProgram.name),
          p.toProgram.slug,
          csvEscape(p.toProgram.name),
          p.baseRate,
          p.currentBonus,
          p.expiresAt?.toISOString() ?? '',
        ].join(','),
      ),
    ];
    return lines.join('\n');
  }

  async exportBonusReportsCsv(): Promise<string> {
    const reports = await this.prisma.bonusReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const lines = [
      'id,fromProgram,toProgram,bonusPercent,status,reporterEmail,intelSourceId,createdAt,reviewedAt',
      ...reports.map((r: any) =>
        [
          r.id,
          r.fromProgramSlug,
          r.toProgramSlug,
          r.bonusPercent,
          r.status,
          csvEscape(r.reporterEmail ?? ''),
          r.intelSourceId ?? '',
          r.createdAt?.toISOString() ?? '',
          r.reviewedAt?.toISOString() ?? '',
        ].join(','),
      ),
    ];
    return lines.join('\n');
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  async getUsers(filters: {
    search?: string;
    plan?: SubscriptionPlan;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = getPaginationSkip(page, limit);

    const where: any = {};

    if (filters.plan) where.subscriptionPlan = filters.plan;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true,
          isAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return createPaginatedResult(users, total, page, limit);
  }

  async getUserById(id: string) {
    const user = (await this.prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
        milesBalances: { include: { program: { select: { name: true, slug: true } } } },
        _count: {
          select: {
            alerts: true,
            savedOffers: true,
            bonusReports: true,
            deviceTokens: true,
            notifications: true,
          } as any,
        },
      },
    })) as any;

    if (!user) throw new NotFoundException('User not found');

    // Enrichment: stats adicionais (queries paralelas)
    const [
      reportsApproved,
      reportsRejected,
      referralsCount,
      notificationsUnread,
      lastLoginProxy,
    ] = await Promise.all([
      this.prisma.bonusReport.count({
        where: { reporterId: id, status: 'APPROVED' },
      }),
      this.prisma.bonusReport.count({
        where: { reporterId: id, status: 'REJECTED' },
      }),
      this.prisma.user.count({ where: { referredById: id } as any }),
      this.prisma.notification.count({ where: { userId: id, isRead: false } }),
      this.prisma.deviceToken.findFirst({
        where: { userId: id },
        orderBy: { lastUsedAt: 'desc' },
        select: { lastUsedAt: true },
      }),
    ]);

    // Calcula valor total da carteira
    const walletTotalBrl = user.milesBalances.reduce(
      (acc: number, b: any) => acc + (b.balance / 1000) * Number(b.program.avgCpmCurrent || 0),
      0,
    );

    return {
      ...user,
      enrichedStats: {
        reportsApproved,
        reportsRejected,
        accuracyPercent:
          reportsApproved + reportsRejected > 0
            ? parseFloat(
                ((reportsApproved / (reportsApproved + reportsRejected)) * 100).toFixed(1),
              )
            : null,
        referralsCount,
        notificationsUnread,
        lastActive: lastLoginProxy?.lastUsedAt ?? user.lastActiveAt ?? null,
        walletTotalBrl: parseFloat(walletTotalBrl.toFixed(2)),
      },
    };
  }

  async updateUserPlan(id: string, plan: SubscriptionPlan) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { subscriptionPlan: plan },
      select: { id: true, name: true, email: true, subscriptionPlan: true },
    });
  }

  // ─── Offers ──────────────────────────────────────────────────────────────────

  async getOffers(filters: {
    search?: string;
    programId?: string;
    type?: string;
    classification?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = getPaginationSkip(page, limit);

    const where: any = { isDeleted: false };

    if (filters.programId) where.programId = filters.programId;
    if (filters.type) where.type = filters.type;
    if (filters.classification) where.classification = filters.classification;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        include: { program: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.offer.count({ where }),
    ]);

    return createPaginatedResult(offers, total, page, limit);
  }

  async createOffer(dto: CreateOfferDto) {
    const classification =
      dto.classification ?? classifyFromCpm(dto.cpm);

    const offer = await this.prisma.offer.create({
      data: {
        programId: dto.programId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        cpm: dto.cpm,
        classification,
        sourceUrl: dto.sourceUrl,
        affiliateUrl: dto.affiliateUrl,
        startsAt: dto.startsAt,
        expiresAt: dto.expiresAt,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata as any,
      },
      include: { program: { select: { id: true, name: true, slug: true } } },
    });

    // Feat 3: Matching — notifica usuários cuja preferência bate no programa.
    // Fire-and-forget. Só dispara pra ofertas IMPERDIVEL/BOA pra evitar spam.
    if (offer.isActive && classification !== 'NORMAL') {
      this.notifyMatchingUsers(offer).catch((err) =>
        this.logger.error(`Offer match push failed: ${err.message}`),
      );
    }

    return offer;
  }

  private async notifyMatchingUsers(offer: any) {
    // Busca users cuja preferredPrograms JSON contém o slug do programa desta oferta
    // Abordagem: fetch todos users com prefs, filtrar em JS (ok até ~10k users;
    // depois virar query raw com jsonb_array).
    const prefs = await this.prisma.userPreference.findMany({
      where: {
        preferredPrograms: { not: '[]' },
      },
      select: {
        userId: true,
        preferredPrograms: true,
        user: {
          select: {
            deviceTokens: {
              where: { lastUsedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
              select: { token: true },
            },
          },
        },
      },
    });

    const programSlug = offer.program?.slug;
    if (!programSlug) return;

    const matchedTokens: string[] = [];
    for (const p of prefs) {
      try {
        const arr: string[] = JSON.parse(p.preferredPrograms || '[]');
        if (arr.includes(programSlug)) {
          p.user?.deviceTokens?.forEach((d) => matchedTokens.push(d.token));
        }
      } catch {}
    }

    if (matchedTokens.length === 0) return;

    await this.push.sendToTokens(matchedTokens, {
      title: `💎 ${offer.program.name}: ${offer.title}`,
      body: `CPM ${offer.cpm.toFixed(2)} — ${classificationLabel(offer.classification)}. Toque pra ver.`,
      data: {
        type: 'offer_match',
        offerId: offer.id,
        programSlug,
        deepLink: `/offer/${offer.id}`,
      },
    });
    this.logger.log(
      `Offer match push: sent to ${matchedTokens.length} device(s) (${programSlug})`,
    );
  }

  async updateOffer(id: string, dto: Partial<CreateOfferDto>) {
    const offer = await this.prisma.offer.findFirst({ where: { id, isDeleted: false } });
    if (!offer) throw new NotFoundException('Offer not found');

    const classification =
      dto.classification ?? (dto.cpm !== undefined ? classifyFromCpm(dto.cpm) : undefined);

    return this.prisma.offer.update({
      where: { id },
      data: {
        ...dto,
        ...(classification && { classification }),
        metadata: dto.metadata as any,
      },
      include: { program: { select: { id: true, name: true, slug: true } } },
    });
  }

  async softDeleteOffer(id: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, isDeleted: false } });
    if (!offer) throw new NotFoundException('Offer not found');

    await this.prisma.offer.update({ where: { id }, data: { isDeleted: true, isActive: false } });
    return { message: 'Offer deleted successfully' };
  }

  async toggleOfferActive(id: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, isDeleted: false } });
    if (!offer) throw new NotFoundException('Offer not found');

    return this.prisma.offer.update({
      where: { id },
      data: { isActive: !offer.isActive },
      select: { id: true, isActive: true },
    });
  }

  // ─── Programs ────────────────────────────────────────────────────────────────

  async getPrograms() {
    return this.prisma.loyaltyProgram.findMany({ orderBy: { name: 'asc' } });
  }

  async createProgram(dto: {
    name: string;
    slug: string;
    logoUrl?: string;
    websiteUrl?: string;
    avgCpmCurrent?: number;
    isActive?: boolean;
  }) {
    return this.prisma.loyaltyProgram.create({ data: dto });
  }

  async updateProgram(id: string, dto: Partial<{
    name: string;
    slug: string;
    logoUrl: string;
    websiteUrl: string;
    avgCpmCurrent: number;
    isActive: boolean;
  }>) {
    const prog = await this.prisma.loyaltyProgram.findUnique({ where: { id } });
    if (!prog) throw new NotFoundException('Program not found');
    return this.prisma.loyaltyProgram.update({ where: { id }, data: dto });
  }

  // ─── Articles (delegate to ContentService) ───────────────────────────────────

  async getArticles() {
    return this.contentService.getArticles({ page: 1, limit: 100 }, null);
  }

  async createArticle(dto: CreateArticleDto) {
    return this.contentService.createArticle(dto);
  }

  async updateArticle(id: string, dto: UpdateArticleDto) {
    return this.contentService.updateArticle(id, dto);
  }

  async deleteArticle(id: string) {
    return this.contentService.deleteArticle(id);
  }

  // ─── Award Charts ────────────────────────────────────────────────────────────

  async getAwardCharts(query: {
    programId?: string;
    origin?: string;
    destination?: string;
    cabinClass?: string;
  }) {
    const where: any = {};
    if (query.programId) where.programId = query.programId;
    if (query.origin) where.origin = query.origin;
    if (query.destination) where.destination = query.destination;
    if (query.cabinClass) where.cabinClass = query.cabinClass;
    return this.prisma.awardChart.findMany({
      where,
      include: { program: { select: { id: true, name: true, slug: true } } },
      orderBy: [
        { program: { name: 'asc' } },
        { destinationName: 'asc' },
        { cabinClass: 'asc' },
      ],
    });
  }

  async createAwardChart(data: any) {
    return this.prisma.awardChart.create({
      data,
      include: { program: true },
    });
  }

  async updateAwardChart(id: string, data: any) {
    return this.prisma.awardChart.update({
      where: { id },
      data,
      include: { program: true },
    });
  }

  async deleteAwardChart(id: string) {
    await this.prisma.awardChart.delete({ where: { id } });
    return { message: 'Rota removida' };
  }

  // ─── Broadcast ───────────────────────────────────────────────────────────────

  async broadcastNotification(
    title: string,
    body: string,
    targetPlan: 'ALL' | SubscriptionPlan = 'ALL',
    deepLink?: string,
  ) {
    const where =
      targetPlan === 'ALL' ? {} : { subscriptionPlan: targetPlan as SubscriptionPlan };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    // Dupla entrega: NotificationsService (in-app DB) + PushService (Expo)
    await this.notificationsService.broadcastPush(userIds, title, body);

    // Push real via devices ativos dos users targeted
    const cutoff = new Date(Date.now() - 30 * 86400_000);
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        userId: { in: userIds },
        lastUsedAt: { gte: cutoff },
      },
      select: { token: true },
    });
    let pushResult = { sent: 0, errors: 0 };
    if (devices.length > 0) {
      pushResult = await this.push.sendToTokens(
        devices.map((d) => d.token),
        {
          title,
          body,
          data: deepLink ? { type: 'admin_broadcast', deepLink } : { type: 'admin_broadcast' },
        },
      );
    }

    this.logger.log(
      `Broadcast: ${userIds.length} users targeted, ${pushResult.sent} pushes delivered (${pushResult.errors} errors)`,
    );
    return {
      message: `Broadcast: ${userIds.length} users · ${pushResult.sent} pushes entregues`,
      usersCount: userIds.length,
      devicesCount: devices.length,
      pushSent: pushResult.sent,
      pushErrors: pushResult.errors,
    };
  }
}
