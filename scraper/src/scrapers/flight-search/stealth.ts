import type { BrowserContext, Page } from 'playwright';
import { chromium as baseChromium } from 'playwright-extra';
// @ts-ignore - puppeteer-extra-plugin-stealth não tem types, mas funciona com playwright-extra
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// Inicializa o plugin stealth UMA vez na carga do módulo.
// Ele reconfigura o navigator.webdriver, plugins, languages, chrome.runtime,
// WebGL fingerprint, audio fingerprint, WebRTC, etc. — cobre ~40 heurísticas
// conhecidas de bot detection. Gratuito, open source, mantido pela comunidade.
const stealth = StealthPlugin();
// Alguns evasions específicos são incompatíveis com Playwright + Chromium moderno;
// removemos os problemáticos pra manter o browser estável.
stealth.enabledEvasions.delete('iframe.contentWindow');
stealth.enabledEvasions.delete('media.codecs');
baseChromium.use(stealth);

/** Export do chromium "turbinado" — usar este em vez do import direto de playwright */
export const chromium = baseChromium;

/**
 * Gera user-agent realista a partir da biblioteca `user-agents`.
 * A lib mantém stats reais de distribuição (Chrome Win 64 é mais comum etc),
 * e a cada chamada devolve um UA válido e recente.
 * Filtramos pra desktop + chrome pra ficar consistente com a viewport.
 */
export function getRealisticUserAgent(): string {
  const ua = new UserAgent({
    deviceCategory: 'desktop',
    platform: /^(Win|Mac|Linux)/i,
  });
  return ua.toString();
}

/**
 * Configura um BrowserContext com:
 * - user-agent realista (da lib user-agents, não mais fixo)
 * - locale pt-BR + timezone Sao Paulo + geolocation
 * - storageState opcional (cookies persistidos entre runs — chave pra Akamai!)
 * - extra HTTP headers condizentes com o UA
 *
 * O stealth plugin já foi aplicado no chromium.use() acima, então não precisa
 * mais de addInitScript manual.
 */
export async function createStealthContext(
  browser: any,
  opts: { storageState?: string; userAgent?: string } = {},
): Promise<BrowserContext> {
  const userAgent = opts.userAgent || getRealisticUserAgent();

  const contextOptions: any = {
    userAgent,
    viewport: {
      width: 1366 + Math.floor(Math.random() * 200),
      height: 768 + Math.floor(Math.random() * 100),
    },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    geolocation: { latitude: -23.5505, longitude: -46.6333 },
    permissions: ['geolocation'],
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: false,
    javaScriptEnabled: true,
    extraHTTPHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  };

  // storageState carrega cookies (_abck, ak_bmsc, bm_sz etc.) + localStorage de um run anterior.
  // Akamai valida esses cookies; se válidos, pulamos o challenge inteiro na próxima visita.
  if (opts.storageState) {
    contextOptions.storageState = opts.storageState;
  }

  return browser.newContext(contextOptions);
}

/** Delay humano entre ações — Akamai detecta sequências robóticas muito rápidas. */
export function humanDelay(min = 1500, max = 4000): Promise<void> {
  const delay = min + Math.random() * (max - min);
  return new Promise((r) => setTimeout(r, delay));
}

/** Movimento de mouse realista antes de clicar (bezier-ish, não linha reta). */
export async function humanClick(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector);
  if (!element) return;
  const box = await element.boundingBox();
  if (!box) return;

  const x = box.x + box.width * (0.3 + Math.random() * 0.4);
  const y = box.y + box.height * (0.3 + Math.random() * 0.4);

  await page.mouse.move(x, y, { steps: 5 + Math.floor(Math.random() * 10) });
  await humanDelay(100, 300);
  await page.mouse.click(x, y);
}

/** Fecha popups de cookie/consentimento comuns em sites BR. */
export async function dismissBanners(page: Page): Promise<void> {
  const selectors = [
    '[id*="cookie"] button', '[class*="cookie"] button',
    '[id*="consent"] button', '[class*="consent"] button',
    '[id*="lgpd"] button', '[class*="lgpd"] button',
    'button[id*="accept"]', 'button[class*="accept"]',
    '[data-testid*="cookie"]', '[data-testid*="accept"]',
  ];

  for (const sel of selectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        await humanDelay(500, 1000);
        break;
      }
    } catch {
      /* ignore */
    }
  }
}

/** Mantido pra compat: scrapers antigos importam este nome. */
export const getRandomUserAgent = getRealisticUserAgent;
