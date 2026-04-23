import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health checks. Endpoints públicos (sem JWT) pra load balancers e uptime monitors.
 *
 * - /health       → shallow (só responde 200, <5ms)
 * - /health/deep  → profundo: checa DB, scraper, cache. Demora 100-500ms.
 *
 * Em prod, apontar UptimeRobot (ou Healthchecks.io) pra /health/deep a cada 5min.
 */

interface ComponentStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  error?: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly scraperUrl = process.env.SCRAPER_URL || 'http://localhost:3002';
  private readonly scraperEnabled = (process.env.SCRAPER_ENABLED || 'true').toLowerCase() !== 'false';

  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness — só confirma que processo está rodando' })
  shallow() {
    return {
      status: 'ok',
      service: 'milhasextras-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'k8s-style liveness probe (retorna 200 enquanto node rodar)' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'k8s-style readiness (checa DB disponível)' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not-ready' };
    }
  }

  @Public()
  @Get('mem')
  @ApiOperation({ summary: 'Memory + process info (debug/ops)' })
  mem() {
    const m = process.memoryUsage();
    return {
      rssMb: Math.round(m.rss / 1024 / 1024),
      heapUsedMb: Math.round(m.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(m.heapTotal / 1024 / 1024),
      externalMb: Math.round(m.external / 1024 / 1024),
      uptimeSec: Math.round(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
    };
  }

  @Public()
  @Get('deep')
  @ApiOperation({ summary: 'Readiness — verifica DB, scraper, cache. Usar em load balancers.' })
  async deep() {
    const started = Date.now();

    // Checks rodam em PARALELO — antes era sequencial (~700ms total).
    // Agora bota um teto pelo componente mais lento (~250ms).
    const checks = [
      this.checkComponent('database', async () => {
        await this.prisma.$queryRaw`SELECT 1`;
      }),
      this.scraperEnabled
        ? this.checkComponent('scraper', async () => {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 3000);
            try {
              const r = await fetch(`${this.scraperUrl}/health`, { signal: controller.signal });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
            } finally {
              clearTimeout(t);
            }
          })
        : Promise.resolve<ComponentStatus>({
            name: 'scraper',
            status: 'degraded',
            error: 'SCRAPER_ENABLED=false',
          }),
      this.checkComponent('cache-table', async () => {
        await this.prisma.liveFlightCache.count({ take: 1 });
      }),
    ];

    const components = await Promise.all(checks);

    // Status agregado:
    //   up: tudo OK
    //   degraded: scraper/cache fora MAS DB up → responde requests
    //   down: DB fora → não responde nada
    const dbDown = components.find((c) => c.name === 'database')?.status === 'down';
    const anyDown = components.some((c) => c.status === 'down');
    const anyDegraded = components.some((c) => c.status === 'degraded');
    const overall = dbDown ? 'down' : anyDown || anyDegraded ? 'degraded' : 'up';

    const body = {
      status: overall,
      service: 'milhasextras-backend',
      uptime: process.uptime(),
      totalLatencyMs: Date.now() - started,
      components,
      timestamp: new Date().toISOString(),
    };

    return body;
  }

  // SR-HEALTH-LEAK-01: antes era @Public — expunha user count + integrações
  // pra reconhecimento. Agora requer admin JWT.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('extended')
  @ApiOperation({ summary: 'Health detalhado + counts de tabelas (admin only)' })
  async extended() {
    const started = Date.now();
    const [
      users,
      bonusReports,
      partnerships,
      offers,
      devices,
      intelSources,
      cacheFresh,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.bonusReport.count(),
      this.prisma.transferPartnership.count(),
      this.prisma.offer.count({ where: { isActive: true, isDeleted: false } }),
      this.prisma.deviceToken.count(),
      (this.prisma as any).intelSource.count({ where: { isActive: true } }),
      this.prisma.liveFlightCache.count({
        where: { fetchedAt: { gte: new Date(Date.now() - 86400_000) } },
      }),
    ]);

    return {
      status: 'ok',
      service: 'milhasextras-backend',
      uptime: process.uptime(),
      latencyMs: Date.now() - started,
      counts: {
        users,
        bonusReports,
        activePartnerships: partnerships,
        activeOffers: offers,
        deviceTokens: devices,
        activeIntelSources: intelSources,
        cacheFresh24h: cacheFresh,
      },
      config: {
        nodeEnv: process.env.NODE_ENV,
        schedulerEnabled:
          process.env.SCHEDULER_ENABLED !== 'false' &&
          process.env.NODE_ENV === 'production',
        scraperEnabled: this.scraperEnabled,
        integrations: {
          sentry: !!process.env.SENTRY_DSN,
          posthog: !!process.env.POSTHOG_API_KEY,
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          twilio: !!process.env.TWILIO_ACCOUNT_SID,
          stripe: !!process.env.STRIPE_SECRET_KEY,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkComponent(
    name: string,
    fn: () => Promise<void>,
  ): Promise<ComponentStatus> {
    const started = Date.now();
    try {
      await fn();
      return { name, status: 'up', latencyMs: Date.now() - started };
    } catch (err: any) {
      return {
        name,
        status: 'down',
        latencyMs: Date.now() - started,
        error: err.message?.substring(0, 200) || 'unknown error',
      };
    }
  }
}
