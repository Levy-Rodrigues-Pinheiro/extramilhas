import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SLO tracking simples sem prometheus/grafana externos.
 * Define targets de disponibilidade + error budget. Calcula budget burn
 * usando dados de SecurityEvent (reaproveitando o que já rastreamos).
 *
 * SLO targets (mês corrente):
 *   - Availability: 99.5% (tolera ~3.6h downtime/mês)
 *   - Error rate: <0.5% das requests
 *   - p99 latency: <1000ms (medido em loglevel, não aqui)
 *
 * Budget burn rate:
 *   - >10x = page on-call
 *   - 2-10x = slow burn, investigar
 *   - <2x = safe
 *
 * Real SLO tracking preciso requer métricas de janela deslizante —
 * aqui usamos aproximação com AuditLog + SecurityEvent.
 */
@Injectable()
export class SloService {
  constructor(private prisma: PrismaService) {}

  private readonly SLO_AVAILABILITY = 99.5; // %
  private readonly SLO_ERROR_RATE_MAX = 0.5; // %
  private readonly SLO_P99_MS = 1000;

  async getStatus(windowHours = 720 /* 30d */) {
    const since = new Date(Date.now() - windowHours * 3600_000);
    const windowMs = windowHours * 3600_000;

    // Error proxy: events com score >= 50 ou eventType=RATE_LIMIT_HIT/LOGIN_FAIL
    const [totalEvents, errorEvents, latestSnapshot] = await Promise.all([
      (this.prisma as any).securityEvent.count({
        where: { createdAt: { gte: since } },
      }),
      (this.prisma as any).securityEvent.count({
        where: {
          createdAt: { gte: since },
          OR: [
            { riskScore: { gte: 50 } },
            { eventType: 'RATE_LIMIT_HIT' },
          ],
        },
      }),
      this.prisma.auditLog.findFirst({
        where: { action: 'SNAPSHOT' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;
    const errorBudget = this.SLO_ERROR_RATE_MAX;
    const budgetUsed = errorBudget > 0 ? (errorRate / errorBudget) * 100 : 0;
    const budgetRemaining = Math.max(0, 100 - budgetUsed);

    // Burn rate: "se seguir nesse ritmo, quando estoura budget?"
    // burnRate = (errorsInWindow / windowDuration) / (budgetTotal / monthDuration)
    const monthMs = 30 * 86400_000;
    const burnRate =
      budgetUsed > 0 ? (budgetUsed / 100) * (monthMs / windowMs) : 0;

    const alertLevel =
      burnRate >= 10 ? 'PAGE' : burnRate >= 2 ? 'WARN' : 'OK';

    return {
      slos: {
        availabilityTarget: this.SLO_AVAILABILITY,
        errorRateTarget: this.SLO_ERROR_RATE_MAX,
        p99LatencyTargetMs: this.SLO_P99_MS,
      },
      window: {
        hours: windowHours,
        startedAt: since.toISOString(),
      },
      metrics: {
        totalEvents,
        errorEvents,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      errorBudget: {
        budget: errorBudget,
        used: Math.round(budgetUsed * 10) / 10,
        remaining: Math.round(budgetRemaining * 10) / 10,
        burnRate: Math.round(burnRate * 100) / 100,
        alertLevel,
      },
      latestSnapshot: latestSnapshot
        ? {
            at: latestSnapshot.createdAt,
            counts: (() => {
              try {
                return JSON.parse(latestSnapshot.after ?? '{}');
              } catch {
                return null;
              }
            })(),
          }
        : null,
      note:
        'SLO tracking baseado em proxies (SecurityEvent + AuditLog). Pra precisão real, integre Grafana/Datadog via OTel.',
    };
  }
}
