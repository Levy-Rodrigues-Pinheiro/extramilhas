import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
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
  private readonly crowdsourcedHmacSecret: string;

  constructor(private cache: FlightCacheService) {
    this.expectedSecret = process.env.SCRAPER_WEBHOOK_SECRET || '';
    // SR-CROWDSOURCED-01: antes era hardcode 'crowdsourced-v1' no bundle mobile —
    // qualquer user podia extrair e injetar dados fake no cache.
    // Agora: secret distinto em env var, validado via HMAC+timingSafe.
    // Mobile app recebe esse secret via config endpoint autenticado.
    this.crowdsourcedHmacSecret = process.env.CROWDSOURCED_HMAC_SECRET || '';
    if (!this.expectedSecret) {
      this.logger.warn(
        'SCRAPER_WEBHOOK_SECRET não configurado — webhook aceitará qualquer request!',
      );
    }
  }

  /**
   * Comparação constant-time — evita timing side-channel que vaze bytes do secret.
   */
  private safeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a || '', 'utf8');
    const bBuf = Buffer.from(b || '', 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }

  @Public()
  @Post('scraper-result')
  // Throttle generoso — scrapers legítimos podem mandar muitos resultados em lote.
  // Limite p/ IP: 60 requests/minuto. Suficiente p/ GH Actions + muitos usuários crowdsourcing.
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Recebe resultados de scrapers externos (GH Actions, CF Workers, crowdsourcing)' })
  async receiveScraperResult(
    @Headers('x-scraper-secret') secret: string,
    @Headers('x-crowdsourced-signature') crowdSig: string,
    @Headers('x-crowdsourced-timestamp') crowdTs: string,
    @Body() payload: WebhookPayload,
  ) {
    const isCrowdsourced = typeof payload?.source === 'string' && payload.source.startsWith('crowdsourced-');

    let validSecret = false;
    if (!this.expectedSecret) {
      // Dev mode sem secret — aceita tudo (warning já logado no ctor).
      validSecret = true;
    } else if (secret && this.safeCompare(secret, this.expectedSecret)) {
      // GH Actions / CF Worker com secret compartilhado (timing-safe).
      validSecret = true;
    } else if (isCrowdsourced && this.crowdsourcedHmacSecret && crowdSig && crowdTs) {
      // Crowdsourced: HMAC(secret, ts + "." + JSON body).
      // Timestamp rejeitado se >5min (replay window).
      const now = Math.floor(Date.now() / 1000);
      const ts = parseInt(crowdTs, 10);
      if (Number.isFinite(ts) && Math.abs(now - ts) <= 300) {
        const canonical = `${crowdTs}.${JSON.stringify(payload)}`;
        const expected = createHmac('sha256', this.crowdsourcedHmacSecret)
          .update(canonical)
          .digest('hex');
        if (this.safeCompare(crowdSig, expected)) {
          validSecret = true;
        }
      }
    }

    if (!validSecret) {
      this.logger.warn(`Webhook rejeitado (secret inválido) — source=${payload?.source}`);
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Validação do payload
    if (!payload?.results || !Array.isArray(payload.results)) {
      throw new HttpException('Invalid payload: results[] required', HttpStatus.BAD_REQUEST);
    }

    // Sanity checks APERTADOS pra mitigar payload spam de actor que
    // tenha lido o secret 'crowdsourced-v1' do bundle mobile.
    // Limites baseados em ranges reais do mercado brasileiro.
    const ALLOWED_PROGRAMS = new Set(['smiles', 'tudoazul', 'latampass']);
    const IATA_RX = /^[A-Z]{3}$/;
    const ISO_DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
    const ALLOWED_CABIN = new Set(['economy', 'business', 'first']);

    const valid = payload.results.filter((r) => {
      if (!r || typeof r !== 'object') return false;
      // Programa whitelisted
      if (!ALLOWED_PROGRAMS.has(r.programSlug)) return false;
      // IATAs em formato ABC, sempre 3 letras maiúsculas
      if (!IATA_RX.test(r.origin) || !IATA_RX.test(r.destination)) return false;
      if (r.origin === r.destination) return false; // mesma origem/destino é spam
      // Data ISO válida e dentro de range razoável (hoje a +2 anos)
      if (!ISO_DATE_RX.test(r.date)) return false;
      const d = new Date(r.date).getTime();
      const now = Date.now();
      if (d < now - 86400_000 || d > now + 730 * 86400_000) return false;
      // Cabin class válida
      if (!ALLOWED_CABIN.has(r.cabinClass.toLowerCase())) return false;
      // Milhas em range realista (era 1-10M, agora 2k-500k)
      if (typeof r.milesRequired !== 'number') return false;
      if (r.milesRequired < 2_000 || r.milesRequired > 500_000) return false;
      // Tax em range realista (R$0 a R$10k)
      if (r.taxBrl != null && (typeof r.taxBrl !== 'number' || r.taxBrl < 0 || r.taxBrl > 10_000)) return false;
      // Stops realista (0 a 5)
      if (r.stops != null && (typeof r.stops !== 'number' || r.stops < 0 || r.stops > 5)) return false;
      return true;
    });

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
