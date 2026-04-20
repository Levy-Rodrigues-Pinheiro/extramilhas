import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferClassification, SubscriptionPlan } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/dto/pagination.dto';
import { ContentService, CreateArticleDto, UpdateArticleDto } from '../content/content.service';

function classifyFromCpm(cpm: number): OfferClassification {
  if (cpm < 20) return OfferClassification.IMPERDIVEL;
  if (cpm <= 30) return OfferClassification.BOA;
  return OfferClassification.NORMAL;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private contentService: ContentService,
  ) {}

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
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        preferences: true,
        milesBalances: { include: { program: { select: { name: true, slug: true } } } },
        _count: { select: { alerts: true, savedOffers: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
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

    return this.prisma.offer.create({
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
  ) {
    const where =
      targetPlan === 'ALL' ? {} : { subscriptionPlan: targetPlan as SubscriptionPlan };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    await this.notificationsService.broadcastPush(userIds, title, body);

    return { message: `Broadcast sent to ${userIds.length} user(s).`, count: userIds.length };
  }
}
