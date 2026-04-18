import type { Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../../logger';
import { chromium, createStealthContext, getRealisticUserAgent } from './stealth';

/**
 * Pool de browsers por programa.
 *
 * Por que existe:
 * 1. Launch de browser custa 2-4s. Reutilizar economiza muito tempo.
 * 2. Akamai associa _abck cookie à IP+UA+fingerprint. Manter contexto vivo
 *    preserva o cookie por ~30min → próximo request passa direto sem challenge.
 * 3. Depois de N usos, a sessão começa a levantar bandeira (comportamento
 *    repetido demais). Então descartamos e recriamos — trade-off entre custo
 *    de launch e success rate.
 *
 * Estratégia de persistência:
 * - storageState é salvo em disco (./data/sessions/<program>.json) a cada scrape
 *   bem-sucedido. Na próxima boot do scraper, carrega de volta.
 * - Session expira em STORAGE_MAX_AGE_MS; após isso, ignora o disco e começa limpa.
 */

// ───────────────────────────────────────────────────────────────────────────
// Configuração
// ───────────────────────────────────────────────────────────────────────────

const MAX_USES_PER_CONTEXT = parseInt(process.env.POOL_MAX_USES || '8', 10);
const MAX_CONTEXT_AGE_MS = parseInt(process.env.POOL_MAX_AGE_MS || '1800000', 10); // 30 min
const STORAGE_MAX_AGE_MS = parseInt(process.env.STORAGE_MAX_AGE_MS || '10800000', 10); // 3h
const SESSION_DIR = path.resolve(process.cwd(), 'data', 'sessions');

// ───────────────────────────────────────────────────────────────────────────
// Entry do pool por programa
// ───────────────────────────────────────────────────────────────────────────

interface PoolEntry {
  browser: Browser;
  context: BrowserContext;
  createdAt: number;
  usesRemaining: number;
  program: string;
  inUse: boolean;
}

const pool = new Map<string, PoolEntry>();
let browserLaunchPromise: Promise<Browser> | null = null;
let sharedBrowser: Browser | null = null;

// ───────────────────────────────────────────────────────────────────────────
// Browser compartilhado
// ───────────────────────────────────────────────────────────────────────────

/**
 * Um único Browser process serve todos os programas — contexts é que são
 * isolados (cookies, storage). Isso economiza MUITA RAM.
 */
async function getSharedBrowser(): Promise<Browser> {
  if (sharedBrowser) return sharedBrowser;
  if (browserLaunchPromise) return browserLaunchPromise;

  browserLaunchPromise = (async () => {
    logger.info('[Pool] Launching shared Chromium browser...');
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    // Se o browser morrer (crash, oom), limpamos tudo
    browser.on('disconnected', () => {
      logger.warn('[Pool] Shared browser disconnected — clearing pool');
      sharedBrowser = null;
      browserLaunchPromise = null;
      for (const entry of pool.values()) entry.usesRemaining = 0;
      pool.clear();
    });

    sharedBrowser = browser;
    return browser;
  })();

  return browserLaunchPromise;
}

// ───────────────────────────────────────────────────────────────────────────
// storageState: disco <-> contexto
// ───────────────────────────────────────────────────────────────────────────

async function loadStorageState(program: string): Promise<string | undefined> {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    const filePath = path.join(SESSION_DIR, `${program}.json`);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) return undefined;

    const age = Date.now() - stat.mtimeMs;
    if (age > STORAGE_MAX_AGE_MS) {
      logger.info(`[Pool] Session for ${program} expired (${Math.round(age / 60000)}min old), ignoring`);
      return undefined;
    }

    logger.info(`[Pool] Loading persisted session for ${program} (${Math.round(age / 60000)}min old)`);
    return filePath;
  } catch {
    return undefined;
  }
}

async function saveStorageState(context: BrowserContext, program: string): Promise<void> {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    const filePath = path.join(SESSION_DIR, `${program}.json`);
    await context.storageState({ path: filePath });
  } catch (err: any) {
    logger.warn(`[Pool] Failed to save session for ${program}: ${err.message}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// API pública do pool
// ───────────────────────────────────────────────────────────────────────────

/**
 * Pega (ou cria) um contexto pronto pra scraping. Retorna também uma Page nova.
 * O caller DEVE chamar `release()` quando terminar.
 */
export async function acquirePage(program: string): Promise<{
  context: BrowserContext;
  page: Page;
  release: (success: boolean) => Promise<void>;
}> {
  const browser = await getSharedBrowser();
  let entry = pool.get(program);

  // Expira se muito velho ou sem usos
  if (entry) {
    const age = Date.now() - entry.createdAt;
    const expired = age > MAX_CONTEXT_AGE_MS || entry.usesRemaining <= 0;
    if (expired) {
      logger.info(
        `[Pool] Retiring ${program} context (age=${Math.round(age / 1000)}s, uses_left=${entry.usesRemaining})`,
      );
      entry.context.close().catch(() => {});
      pool.delete(program);
      entry = undefined;
    } else if (entry.inUse) {
      // Alguém já pegou — pra simplicidade, criamos um contexto novo descartável
      logger.debug(`[Pool] ${program} context busy, creating disposable`);
      entry = undefined;
    }
  }

  let isDisposable = false;
  if (!entry) {
    const storageState = await loadStorageState(program);
    const userAgent = getRealisticUserAgent();
    const context = await createStealthContext(browser, { storageState, userAgent });

    // Decisão: se existe entrada "cabeça" no pool, não adiciona outra — cria descartável
    if (pool.has(program)) {
      isDisposable = true;
    } else {
      entry = {
        browser,
        context,
        createdAt: Date.now(),
        usesRemaining: MAX_USES_PER_CONTEXT,
        program,
        inUse: false,
      };
      pool.set(program, entry);
    }

    if (isDisposable) {
      const page = await context.newPage();
      return {
        context,
        page,
        release: async () => {
          context.close().catch(() => {});
        },
      };
    }
  }

  entry!.inUse = true;
  entry!.usesRemaining--;
  const page = await entry!.context.newPage();

  return {
    context: entry!.context,
    page,
    release: async (success: boolean) => {
      try {
        await page.close().catch(() => {});
        if (success) {
          // Só persiste cookies quando scrape deu certo
          await saveStorageState(entry!.context, program);
        }
      } finally {
        entry!.inUse = false;
      }
    },
  };
}

/** Fecha tudo. Chamar em shutdown do processo. */
export async function shutdownPool(): Promise<void> {
  for (const entry of pool.values()) {
    entry.context.close().catch(() => {});
  }
  pool.clear();
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
    browserLaunchPromise = null;
  }
  logger.info('[Pool] Shutdown complete');
}

/** Info do pool pra endpoint /stats */
export function poolStats(): Record<string, any> {
  const entries: Record<string, any> = {};
  for (const [program, entry] of pool.entries()) {
    entries[program] = {
      ageSeconds: Math.round((Date.now() - entry.createdAt) / 1000),
      usesRemaining: entry.usesRemaining,
      inUse: entry.inUse,
    };
  }
  return {
    sharedBrowser: !!sharedBrowser,
    contexts: entries,
    config: {
      maxUsesPerContext: MAX_USES_PER_CONTEXT,
      maxContextAgeMs: MAX_CONTEXT_AGE_MS,
      storageMaxAgeMs: STORAGE_MAX_AGE_MS,
      sessionDir: SESSION_DIR,
    },
  };
}
