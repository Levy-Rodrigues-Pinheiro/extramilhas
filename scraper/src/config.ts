export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',

  databaseUrl: process.env.DATABASE_URL ?? '',

  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3000',

  logLevel: process.env.LOG_LEVEL ?? 'info',

  // How many ms to wait between scraping cycles if running outside cron
  scrapeIntervalMs: Number(process.env.SCRAPE_INTERVAL_MS ?? 300_000),

  // Cron expressions (overridable via env)
  cronScrapeAll: process.env.CRON_SCRAPE_ALL ?? '*/5 * * * *',
  cronUpdateCpm: process.env.CRON_UPDATE_CPM ?? '0 * * * *',
  cronPriceHistory: process.env.CRON_PRICE_HISTORY ?? '0 2 * * *',

  // BullMQ queue names
  queues: {
    offersScraper: 'offers-scraper',
    alertMatcher: 'alert-matcher',
    priceHistoryUpdater: 'price-history-updater',
  },

  // CPM classification thresholds (CPM per 1000 miles, in BRL)
  cpm: {
    imperdivelMax: 20, // <= 20 = IMPERDIVEL
    boaMax: 30,        // 20-30 = BOA, > 30 = NORMAL
  },

  // Programs to scrape
  programs: ['smiles', 'livelo', 'tudoazul', 'latampass', 'esfera'],
} as const;
