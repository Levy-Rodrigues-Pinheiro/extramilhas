import express from 'express';
import cors from 'cors';
import logger from './logger';
import { searchAllPrograms } from './scrapers/flight-search';
import { FlightAwardResult } from './types';
import { MonitorService } from './services/monitor.service';
import { IntelligenceService } from './services/intelligence.service';
import { poolStats, shutdownPool } from './scrapers/flight-search/browser-pool';

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Scraper metrics tracking
// ---------------------------------------------------------------------------
interface ProgramMetrics {
  totalRequests: number;
  successes: number;
  failures: number;
  emptyResults: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  avgResponseTimeMs: number;
  totalResponseTimeMs: number;
}

const scraperMetrics: Record<string, ProgramMetrics> = {};
const globalMetrics = {
  totalSearches: 0,
  cacheHits: 0,
  cacheMisses: 0,
  deduplicatedRequests: 0,
  retriesPerformed: 0,
  startedAt: new Date().toISOString(),
};

function getOrCreateMetrics(program: string): ProgramMetrics {
  if (!scraperMetrics[program]) {
    scraperMetrics[program] = {
      totalRequests: 0,
      successes: 0,
      failures: 0,
      emptyResults: 0,
      lastSuccess: null,
      lastFailure: null,
      avgResponseTimeMs: 0,
      totalResponseTimeMs: 0,
    };
  }
  return scraperMetrics[program];
}

function recordSuccess(program: string, durationMs: number, resultCount: number): void {
  const m = getOrCreateMetrics(program);
  m.totalRequests++;
  if (resultCount > 0) {
    m.successes++;
    m.lastSuccess = new Date().toISOString();
  } else {
    m.emptyResults++;
  }
  m.totalResponseTimeMs += durationMs;
  m.avgResponseTimeMs = Math.round(m.totalResponseTimeMs / m.totalRequests);
}

function recordFailure(program: string, durationMs: number): void {
  const m = getOrCreateMetrics(program);
  m.totalRequests++;
  m.failures++;
  m.lastFailure = new Date().toISOString();
  m.totalResponseTimeMs += durationMs;
  m.avgResponseTimeMs = Math.round(m.totalResponseTimeMs / m.totalRequests);
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------
const cache = new Map<string, { results: FlightAwardResult[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Request deduplication: if the same search is already in-flight, wait for it
// ---------------------------------------------------------------------------
const inFlight = new Map<string, Promise<FlightAwardResult[]>>();

// ---------------------------------------------------------------------------
// Per-scraper timeout (wraps a promise with a timeout)
// ---------------------------------------------------------------------------
const TOTAL_TIMEOUT = 90_000; // 90 seconds total

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// ---------------------------------------------------------------------------
// Search with retry logic
// ---------------------------------------------------------------------------
async function searchWithRetry(params: {
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
}): Promise<FlightAwardResult[]> {
  const startTime = Date.now();

  try {
    const results = await withTimeout(
      searchAllPrograms(params),
      TOTAL_TIMEOUT,
      'searchAllPrograms',
    );

    // Record per-program metrics based on results
    const duration = Date.now() - startTime;
    const allPrograms = ['smiles', 'tudoazul', 'latampass'];
    for (const prog of allPrograms) {
      const count = results.filter(r => r.programSlug === prog).length;
      recordSuccess(prog, duration, count);
    }

    // If total results are empty, retry once
    if (results.length === 0) {
      logger.warn('[HTTP] First attempt returned 0 results, retrying...');
      globalMetrics.retriesPerformed++;

      const retryStart = Date.now();
      const retryResults = await withTimeout(
        searchAllPrograms(params),
        TOTAL_TIMEOUT,
        'searchAllPrograms (retry)',
      );

      const retryDuration = Date.now() - retryStart;
      for (const prog of allPrograms) {
        const count = retryResults.filter(r => r.programSlug === prog).length;
        recordSuccess(prog, retryDuration, count);
      }

      return retryResults;
    }

    return results;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`[HTTP] Search failed: ${error.message}, retrying once...`);

    // Record failure for all programs
    for (const prog of ['smiles', 'tudoazul', 'latampass']) {
      recordFailure(prog, duration);
    }

    // Retry once
    globalMetrics.retriesPerformed++;
    try {
      const retryStart = Date.now();
      const retryResults = await withTimeout(
        searchAllPrograms(params),
        TOTAL_TIMEOUT,
        'searchAllPrograms (retry)',
      );

      const retryDuration = Date.now() - retryStart;
      for (const prog of ['smiles', 'tudoazul', 'latampass']) {
        const count = retryResults.filter(r => r.programSlug === prog).length;
        if (count > 0) {
          recordSuccess(prog, retryDuration, count);
        }
      }

      return retryResults;
    } catch (retryError: any) {
      const retryDuration = Date.now() - startTime;
      for (const prog of ['smiles', 'tudoazul', 'latampass']) {
        recordFailure(prog, retryDuration);
      }
      throw retryError;
    }
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'extramilhas-scraper',
    uptime: process.uptime(),
    cacheSize: cache.size,
    inFlightRequests: inFlight.size,
  });
});

// ---------------------------------------------------------------------------
// Flight search endpoint
// ---------------------------------------------------------------------------
app.post('/api/search-flights', async (req, res) => {
  try {
    const { origin, destination, date, cabinClass } = req.body;

    if (!origin || !destination || !date) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'origin, destination, and date are required',
      });
      return;
    }

    // Validate IATA codes
    if (!/^[A-Za-z]{3}$/.test(origin) || !/^[A-Za-z]{3}$/.test(destination)) {
      return res.status(400).json({
        error: 'Invalid airport code',
        message: 'origin and destination must be 3-letter IATA codes',
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'date must be in YYYY-MM-DD format',
      });
    }

    const normalizedCabin = (cabinClass || 'economy').toLowerCase();
    const key = `${origin}-${destination}-${date}-${normalizedCabin}`.toUpperCase();

    globalMetrics.totalSearches++;

    // Check cache
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      globalMetrics.cacheHits++;
      logger.info(`[HTTP] Cache hit: ${key} (${cached.results.length} results)`);
      return res.json({
        results: cached.results,
        cached: true,
        resultCount: cached.results.length,
      });
    }

    globalMetrics.cacheMisses++;

    // Request deduplication: if same search is already in-flight, wait for it
    if (inFlight.has(key)) {
      globalMetrics.deduplicatedRequests++;
      logger.info(`[HTTP] Dedup: waiting for in-flight request ${key}`);
      try {
        const existingResults = await inFlight.get(key)!;
        return res.json({
          results: existingResults,
          cached: false,
          deduplicated: true,
          resultCount: existingResults.length,
        });
      } catch (err: any) {
        // The in-flight request failed; fall through to start a new one
        logger.warn(`[HTTP] Deduped request failed, starting fresh: ${err.message}`);
      }
    }

    logger.info(`[HTTP] Cache miss: ${key}, starting search...`);

    // Create the search promise and register it for dedup
    const searchParams = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      date,
      cabinClass: normalizedCabin,
    };

    const searchPromise = searchWithRetry(searchParams);
    inFlight.set(key, searchPromise);

    try {
      const results = await searchPromise;

      // Record prices for monitoring
      for (const r of results) {
        MonitorService.recordPrice(r.programSlug, r.origin, r.destination, r.milesRequired);
      }

      // Store in cache
      cache.set(key, { results, timestamp: Date.now() });

      // Clean up old cache entries periodically
      if (cache.size > 100) {
        const now = Date.now();
        for (const [k, v] of cache.entries()) {
          if (now - v.timestamp > CACHE_TTL) {
            cache.delete(k);
          }
        }
      }

      // Enrich each result with confidence, pricePerMile, and deal classification
      const enriched = results.map(r => ({
        ...r,
        deal: IntelligenceService.classifyDeal(r.milesRequired, r.origin, r.destination, r.cabinClass),
        confidence: (r as any).confidence || 50,
        pricePerMile: r.milesRequired > 0 ? Math.round((r.taxBrl / r.milesRequired) * 10000) / 10000 : 0,
      }));

      // Sort by confidence (desc) then by miles (asc)
      enriched.sort((a, b) => b.confidence - a.confidence || a.milesRequired - b.milesRequired);

      // Generate summary
      const summary = IntelligenceService.generateSummary(enriched);

      res.json({
        results: enriched,
        cached: false,
        resultCount: enriched.length,
        summary,
      });
    } finally {
      inFlight.delete(key);
    }
  } catch (error: any) {
    logger.error(`[HTTP] Search failed: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
});

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------
app.delete('/api/cache', (_req, res) => {
  const size = cache.size;
  cache.clear();
  logger.info(`[HTTP] Cache cleared (${size} entries removed)`);
  res.json({ message: 'Cache cleared', entriesRemoved: size });
});

// ---------------------------------------------------------------------------
// Price change monitoring
// ---------------------------------------------------------------------------
app.get('/api/changes', (_req, res) => {
  const changes = MonitorService.getRecentChanges(20);
  res.json({ changes, count: changes.length });
});

// ---------------------------------------------------------------------------
// Scraper statistics (enhanced with orchestrator metrics)
// ---------------------------------------------------------------------------
app.get('/api/stats', (_req, res) => {
  const monitor = MonitorService.getStats();

  const programStats: Record<string, any> = {};
  for (const [prog, m] of Object.entries(scraperMetrics)) {
    programStats[prog] = {
      ...m,
      successRate: m.totalRequests > 0
        ? `${((m.successes / m.totalRequests) * 100).toFixed(1)}%`
        : 'N/A',
    };
  }

  res.json({
    global: {
      ...globalMetrics,
      uptime: process.uptime(),
      cacheSize: cache.size,
      inFlightRequests: inFlight.size,
    },
    scrapers: programStats,
    monitor,
    cache: { entries: cache.size },
    pool: poolStats(),
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
export function startHttpServer(port = 3002): void {
  app.listen(port, () => {
    logger.info(`[HTTP] Flight search server running on port ${port}`);
  });

  // Shutdown limpo do browser pool em SIGINT/SIGTERM
  const shutdown = async (signal: string) => {
    logger.info(`[HTTP] Received ${signal}, shutting down browser pool...`);
    await shutdownPool().catch(() => {});
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}
