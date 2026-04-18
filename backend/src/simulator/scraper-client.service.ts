import { Injectable, Logger } from '@nestjs/common';

export interface ScraperFlightResult {
  programSlug: string;
  programName: string;
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
  milesRequired: number;
  taxBrl: number;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  stops: number;
  duration: string;
  source: 'live_scraping';
  scrapedAt: string;
}

export interface ScraperSearchParams {
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
}

export interface ScraperResponse {
  results: ScraperFlightResult[];
  cached?: boolean;
  deduplicated?: boolean;
  resultCount: number;
  summary?: any;
}

/**
 * Client HTTP para o microserviço scraper (porta 3002).
 *
 * Estratégia defensiva:
 * - Timeout curto (15s default) para não travar a resposta ao usuário
 * - Fail-fast em erro de rede: retorna array vazio em vez de throw
 * - Zero retry aqui (o scraper já faz retry interno)
 */
@Injectable()
export class ScraperClientService {
  private readonly logger = new Logger(ScraperClientService.name);
  private readonly scraperUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly enabled: boolean;

  constructor() {
    this.scraperUrl = process.env.SCRAPER_URL || 'http://localhost:3002';
    this.defaultTimeoutMs = parseInt(process.env.SCRAPER_TIMEOUT_MS || '15000', 10);
    this.enabled = (process.env.SCRAPER_ENABLED || 'true').toLowerCase() !== 'false';

    if (!this.enabled) {
      this.logger.warn('Scraper integration disabled via SCRAPER_ENABLED=false');
    } else {
      this.logger.log(`Scraper client configured: ${this.scraperUrl} (timeout ${this.defaultTimeoutMs}ms)`);
    }
  }

  /**
   * Verifica rapidamente se o scraper está saudável.
   * Não lança — retorna false em qualquer erro.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.scraperUrl}/health`, { signal: controller.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Dispara a busca de voos no scraper. Timeout curto, fail-fast.
   * Retorna [] em qualquer erro — o chamador deve tratar como "sem dados live".
   */
  async searchFlights(
    params: ScraperSearchParams,
    timeoutMs?: number,
  ): Promise<ScraperFlightResult[]> {
    if (!this.enabled) return [];

    const timeout = timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const body = {
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      date: params.date,
      cabinClass: (params.cabinClass || 'economy').toLowerCase(),
    };

    const startTime = Date.now();

    try {
      const res = await fetch(`${this.scraperUrl}/api/search-flights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const elapsed = Date.now() - startTime;

      if (!res.ok) {
        this.logger.warn(
          `Scraper returned ${res.status} for ${body.origin}-${body.destination} (${elapsed}ms)`,
        );
        return [];
      }

      const data = (await res.json()) as ScraperResponse;
      const results = Array.isArray(data.results) ? data.results : [];

      this.logger.log(
        `Scraper returned ${results.length} flights for ${body.origin}-${body.destination} ${body.date} ${body.cabinClass} (${elapsed}ms${data.cached ? ', cached' : ''})`,
      );
      return results;
    } catch (err: any) {
      clearTimeout(timer);
      const elapsed = Date.now() - startTime;
      if (err.name === 'AbortError') {
        this.logger.warn(
          `Scraper timeout after ${elapsed}ms for ${body.origin}-${body.destination}`,
        );
      } else {
        this.logger.warn(
          `Scraper request failed (${elapsed}ms): ${err.message || err}`,
        );
      }
      return [];
    }
  }
}
