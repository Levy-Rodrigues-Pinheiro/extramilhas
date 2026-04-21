import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Anti-fraud engine rule-based. Sem ML real, sem dep extra.
 *
 * Scoring:
 *   - LOGIN_FAIL repetido do mesmo IP: 20/evento (max 80)
 *   - REGISTER_OK do mesmo IP em janela curta (>3 em 1h): 50
 *   - ALERT_CREATE >10 em 5min: 40 (bot suspect)
 *   - RATE_LIMIT_HIT: 30
 *   - UA vazio/scraper comum: 20
 *
 * riskScore >= 70 → log em loglevel warn, admin dashboard prioriza.
 * riskScore >= 90 → auto-block IP (feature flag `anti-fraud-autoblock`).
 */
@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Registra evento + calcula risk score baseado em histórico recente
   * do mesmo IP/user.
   */
  async recordEvent(params: {
    eventType: string;
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, any>;
  }): Promise<{ id: string; riskScore: number }> {
    const now = Date.now();
    const tenMinAgo = new Date(now - 10 * 60_000);
    const oneHourAgo = new Date(now - 60 * 60_000);

    let score = 0;

    // UA empty/known-bot (baixo esforço)
    const ua = params.userAgent?.toLowerCase() ?? '';
    if (!ua || ua.includes('curl') || ua.includes('wget') || ua.includes('python-requests')) {
      score += 20;
    }

    if (params.ipAddress) {
      // Eventos do mesmo IP nos últimos 10min
      const [failsLast10, regsLastHour, limitHitsLast10] = await Promise.all([
        (this.prisma as any).securityEvent.count({
          where: {
            eventType: 'LOGIN_FAIL',
            ipAddress: params.ipAddress,
            createdAt: { gte: tenMinAgo },
          },
        }),
        (this.prisma as any).securityEvent.count({
          where: {
            eventType: { in: ['REGISTER_OK', 'REGISTER_FAIL'] },
            ipAddress: params.ipAddress,
            createdAt: { gte: oneHourAgo },
          },
        }),
        (this.prisma as any).securityEvent.count({
          where: {
            eventType: 'RATE_LIMIT_HIT',
            ipAddress: params.ipAddress,
            createdAt: { gte: tenMinAgo },
          },
        }),
      ]);

      if (failsLast10 >= 5) score += 60;
      else if (failsLast10 >= 3) score += 30;

      if (regsLastHour > 3) score += 50;
      if (limitHitsLast10 > 2) score += 30;
    }

    // Alertas em rajada (bot suspect)
    if (params.eventType === 'ALERT_CREATE' && params.userId) {
      const count = await (this.prisma as any).securityEvent.count({
        where: {
          eventType: 'ALERT_CREATE',
          userId: params.userId,
          createdAt: { gte: new Date(now - 5 * 60_000) },
        },
      });
      if (count >= 10) score += 40;
    }

    score = Math.min(100, score);

    const event = await (this.prisma as any).securityEvent.create({
      data: {
        eventType: params.eventType,
        userId: params.userId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        riskScore: score,
      },
    });

    if (score >= 70) {
      this.logger.warn(
        `Suspicious event ${params.eventType} from ${params.ipAddress ?? 'unknown IP'} (score=${score})`,
      );
    }

    return { id: event.id, riskScore: score };
  }

  /**
   * Dashboard stats pro admin: top IPs suspeitos, eventos recentes,
   * totais por tipo.
   */
  async getAdminStats(windowHours = 24) {
    const since = new Date(Date.now() - windowHours * 3600 * 1000);

    const [byType, topIps, highRisk, totalEvents] = await Promise.all([
      (this.prisma as any).securityEvent.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { eventType: 'desc' } },
      }),
      (this.prisma as any).securityEvent.groupBy({
        by: ['ipAddress'],
        where: {
          createdAt: { gte: since },
          ipAddress: { not: null },
          riskScore: { gte: 30 },
        },
        _count: { _all: true },
        _max: { riskScore: true },
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 20,
      }),
      (this.prisma as any).securityEvent.findMany({
        where: { createdAt: { gte: since }, riskScore: { gte: 70 } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      (this.prisma as any).securityEvent.count({
        where: { createdAt: { gte: since } },
      }),
    ]);

    return {
      windowHours,
      totalEvents,
      byType,
      topSuspiciousIps: topIps,
      highRiskEvents: highRisk,
    };
  }
}
