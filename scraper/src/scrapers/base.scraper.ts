import { config } from '../config';
import logger from '../logger';
import { NormalizedOffer, RawOffer } from '../types';

export abstract class BaseScraper {
  /** Must match the `slug` field in the loyalty_programs table */
  abstract readonly programSlug: string;

  /** Display name for logging */
  abstract readonly programName: string;

  protected readonly logger = logger;

  /**
   * Entry point called by the worker.
   * Uses Playwright to scrape the live website with fallback to estimated data.
   */
  abstract scrapeOffers(): Promise<RawOffer[]>;

  // ---------------------------------------------------------------------------
  // Public interface
  // ---------------------------------------------------------------------------

  /** Scrape, normalize, and return offers ready for persistence. */
  async run(): Promise<NormalizedOffer[]> {
    logger.info(`[${this.programName}] Starting scrape`, {
      env: config.nodeEnv,
    });

    const rawOffers = await this.scrapeOffers();
    logger.info(`[${this.programName}] Scraped ${rawOffers.length} raw offers`);

    const normalized = rawOffers.map((raw) => this.normalizeOffer(raw));
    logger.info(
      `[${this.programName}] Normalized ${normalized.length} offers`,
      {
        classifications: normalized.reduce<Record<string, number>>(
          (acc, o) => {
            acc[o.classification] = (acc[o.classification] ?? 0) + 1;
            return acc;
          },
          {}
        ),
      }
    );

    return normalized;
  }

  // ---------------------------------------------------------------------------
  // Browser & anti-detection helpers
  // ---------------------------------------------------------------------------

  /** Launch a headless Playwright Chromium browser. */
  protected async launchBrowser() {
    const { chromium } = await import('playwright');
    return chromium.launch({ headless: true });
  }

  /** Random delay to mimic human browsing behaviour. */
  protected randomDelay(min = 2000, max = 5000): Promise<void> {
    return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
  }

  /** Rotate through common user-agent strings. */
  protected getRandomUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  // ---------------------------------------------------------------------------
  // Protected helpers
  // ---------------------------------------------------------------------------

  protected normalizeOffer(raw: RawOffer): NormalizedOffer {
    const cpm = this.calculateCpm(raw.priceBrl, raw.miles);
    const classification = this.classifyOffer(cpm);

    return {
      programSlug: this.programSlug,
      type: raw.type,
      title: raw.title,
      description: raw.description,
      cpm,
      classification,
      sourceUrl: raw.url,
      expiresAt: raw.expiresAt,
      metadata: {
        ...(raw.metadata ?? {}),
        miles: raw.miles,
        priceBrl: raw.priceBrl,
        scrapedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Calculate CPM (Custo Por Milha) — BRL per 1 000 miles.
   * Formula: (priceBrl / miles) * 1000
   */
  protected calculateCpm(amountBrl: number, miles: number): number {
    if (miles <= 0) return 0;
    return parseFloat(((amountBrl / miles) * 1_000).toFixed(2));
  }

  /**
   * Classify an offer by CPM bracket.
   * <= 20  → IMPERDIVEL (unmissable)
   * 20-30  → BOA (good)
   * > 30   → NORMAL
   */
  protected classifyOffer(
    cpm: number
  ): 'IMPERDIVEL' | 'BOA' | 'NORMAL' {
    if (cpm <= config.cpm.imperdivelMax) return 'IMPERDIVEL';
    if (cpm <= config.cpm.boaMax) return 'BOA';
    return 'NORMAL';
  }

  /**
   * Returns a random float between min and max (inclusive, 2 decimals).
   */
  protected randomBetween(min: number, max: number): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }

  /**
   * Returns a future Date offset by a random number of days in [minDays, maxDays].
   */
  protected randomFutureDate(minDays = 7, maxDays = 60): Date {
    const days =
      Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Pick a random element from an array.
   */
  protected pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
