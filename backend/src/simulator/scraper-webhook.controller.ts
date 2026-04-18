import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { FlightCacheService } from './flight-cache.service';
import { ScraperFlightResult } from './scraper-client.service';

/**
 * Webhook que recebe resultados de scrapers externos (GitHub Actions, Cloudflare
 * Workers, crowdsourcing) e persiste no LiveFlightCache.
 *
 * Autenticação: header simples `X-Scraper-Secret` comparado com SCRAPER_WEBHOOK_SECRET.
 * Não é HMAC — suficiente para MVP; protege contra spam aleatório mas não contra
 * actor dedicado que consiga ler repo/secrets. Upgrade futuro → HMAC com body.
 */

interface WebhookPayload {
  /** Identificador do source (github-actions, cf-worker, user-contrib). Pra telemetria. */
  source: string;
  /** Lista de resultados scrapeados (mesmo shape do scraper microservice). */
  results: ScraperFlightResult[];
  /** Opcional: metadata extra (run_id, commit, etc.). */
  meta?: Record<string, any>;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class ScraperWebhookController {
  private readonly logger = new Logger(ScraperWebhookController.name);
  private readonly expectedSecret: string;

  constructor(private cache: FlightCacheService) {
    this.expectedSecret = process.env.SCRAPER_WEBHOOK_SECRET || '';
    if (!this.expectedSecret) {
      this.logger.warn(
        'SCRAPER_WEBHOOK_SECRET não configurado — webhook aceitará qualquer request!',
      );
    }
  }

  @Public()
  @Post('scraper-result')
  @ApiOperation({ summary: 'Recebe resultados de scrapers externos (GH Actions, CF Workers, etc.)' })
  async receiveScraperResult(
    @Headers('x-scraper-secret') secret: string,
    @Body() payload: WebhookPayload,
  ) {
    // Autenticação simples por shared secret
    if (this.expectedSecret && secret !== this.expectedSecret) {
      this.logger.warn(`Webhook rejeitado (secret inválido) — source=${payload?.source}`);
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Validação do payload
    if (!payload?.results || !Array.isArray(payload.results)) {
      throw new HttpException('Invalid payload: results[] required', HttpStatus.BAD_REQUEST);
    }

    // Sanity check: cada resultado deve ter campos mínimos
    const valid = payload.results.filter(
      (r) =>
        r &&
        typeof r.programSlug === 'string' &&
        typeof r.origin === 'string' &&
        typeof r.destination === 'string' &&
        typeof r.date === 'string' &&
        typeof r.cabinClass === 'string' &&
        typeof r.milesRequired === 'number' &&
        r.milesRequired > 0 &&
        r.milesRequired < 10_000_000,
    );

    const rejected = payload.results.length - valid.length;
    if (rejected > 0) {
      this.logger.warn(`Webhook de ${payload.source}: ${rejected} resultados inválidos descartados`);
    }

    if (valid.length === 0) {
      return { success: true, saved: 0, rejected, message: 'Nothing to save' };
    }

    const saved = await this.cache.upsertMany(valid);
    this.logger.log(
      `Webhook ${payload.source}: ${saved}/${valid.length} resultados persistidos no cache`,
    );

    return {
      success: true,
      saved,
      rejected,
      source: payload.source,
    };
  }
}
