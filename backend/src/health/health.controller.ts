import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
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
  @Get('deep')
  @ApiOperation({ summary: 'Readiness — verifica DB, scraper, cache. Usar em load balancers.' })
  async deep() {
    const started = Date.now();
    const components: ComponentStatus[] = [];

    // 1. Database
    components.push(await this.checkComponent('database', async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    }));

    // 2. Scraper (se habilitado)
    if (this.scraperEnabled) {
      components.push(await this.checkComponent('scraper', async () => {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3000);
        try {
          const r = await fetch(`${this.scraperUrl}/health`, { signal: controller.signal });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
        } finally {
          clearTimeout(t);
        }
      }));
    } else {
      components.push({ name: 'scraper', status: 'degraded', error: 'SCRAPER_ENABLED=false' });
    }

    // 3. LiveFlightCache (quantidade básica, confirma que tabela responde)
    components.push(await this.checkComponent('cache-table', async () => {
      await this.prisma.liveFlightCache.count({ take: 1 });
    }));

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
