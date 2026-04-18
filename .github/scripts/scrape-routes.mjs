#!/usr/bin/env node
/**
 * Script standalone para scraping em GitHub Actions.
 *
 * Uso:
 *   node .github/scripts/scrape-routes.mjs <origin> [dest1,dest2,...] [date]
 *
 * Exemplo:
 *   node scrape-routes.mjs GRU GIG,SDU,BSB,MIA 2026-07-20
 *
 * Env vars necessárias:
 *   BACKEND_WEBHOOK_URL  — endpoint completo (https://.../api/v1/webhooks/scraper-result)
 *   BACKEND_WEBHOOK_SECRET — shared secret (X-Scraper-Secret)
 *
 * O script:
 * 1. Lança Chromium com stealth
 * 2. Para cada destino, tenta os 3 programas (Smiles, TudoAzul, LATAM)
 * 3. Extrai milhas via interceptação de API + fallback DOM
 * 4. Posta resultado agregado no webhook do backend
 */

import { chromium as baseChromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// Setup stealth
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('iframe.contentWindow');
stealth.enabledEvasions.delete('media.codecs');
baseChromium.use(stealth);
const chromium = baseChromium;

// ─── Args ─────────────────────────────────────────────────────────────────
const [, , origin, destsArg, dateArg] = process.argv;
if (!origin || !destsArg) {
  console.error('Usage: scrape-routes.mjs <origin> <dest1,dest2,...> [date]');
  process.exit(1);
}
const destinations = destsArg.split(',').map((s) => s.trim().toUpperCase());
const date = dateArg || defaultDate();

const WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.BACKEND_WEBHOOK_SECRET;

if (!WEBHOOK_URL) {
  console.error('ERROR: BACKEND_WEBHOOK_URL env var required');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 45); // 45 dias no futuro
  return d.toISOString().slice(0, 10);
}

function randomUA() {
  return new UserAgent({ deviceCategory: 'desktop', platform: /^(Win|Mac|Linux)/i }).toString();
}

function humanDelay(min, max) {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

// ─── URL builders (mesmos dos deep-links do backend) ──────────────────────

function smilesUrl(o, d, dt) {
  return `https://www.smiles.com.br/passagens-aereas?originAirport=${o}&destinationAirport=${d}&departureDate=${dt}&adults=1&children=0&infants=0&cabinType=economic&isRoundTrip=false`;
}
function tudoazulUrl(o, d, dt) {
  const [y, m, day] = dt.split('-');
  const brDate = `${day}-${m}-${y}`;
  return `https://www.voeazul.com.br/br/pt/home/selecao-de-voos?o1=${o}&d1=${d}&dd1=${brDate}&passengers.adults=1&r=false&cc=economy&isAward=true`;
}
function latampassUrl(o, d, dt) {
  return `https://www.latamairlines.com/br/pt/oferta-voos?origin=${o}&destination=${d}&outbound=${dt}T12:00:00.000Z&adt=1&trip=OW&cabin=Economy&redemption=true&sort=RECOMMENDED`;
}

// ─── API interception patterns ────────────────────────────────────────────

const SMILES_API = ['flightsearch', 'airlines/search', '/bff/'];
const AZUL_API = ['availability', 'flights', '/api/search', '/api/booking'];
const LATAM_API = ['offers-search', 'redemption/search', 'catalog/flights'];

// Parse genérico — tenta achar objetos que parecem "voos" em qualquer JSON
function extractFlightsFromJson(json, program) {
  const flights = [];
  const seen = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    // Heurística: objeto com miles/milhas/points + (airline|flightNumber|departure)
    const milesKey = ['miles', 'milhas', 'points', 'pointsAmount', 'fareAmount', 'amount']
      .find((k) => typeof node[k] === 'number' && node[k] > 1000 && node[k] < 2_000_000);
    if (milesKey) {
      const key = `${node[milesKey]}-${node.flightNumber || node.airline || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        flights.push({
          milesRequired: node[milesKey],
          taxBrl: node.taxes || node.tax || node.taxAmount || 0,
          airline: node.airline || node.carrierCode || node.operatingCarrier || '',
          flightNumber: node.flightNumber || node.number || '',
          departureTime: node.departureTime || node.departure || '',
          arrivalTime: node.arrivalTime || node.arrival || '',
          stops: typeof node.stops === 'number' ? node.stops : 0,
          duration: node.duration || '',
        });
      }
    }
    Object.values(node).forEach(walk);
  }

  walk(json);
  return flights;
}

// ─── Scraping de uma rota para um programa ────────────────────────────────

async function scrapeOne(context, program, origin, dest, date) {
  const urls = {
    smiles: smilesUrl(origin, dest, date),
    tudoazul: tudoazulUrl(origin, dest, date),
    latampass: latampassUrl(origin, dest, date),
  };
  const patterns = { smiles: SMILES_API, tudoazul: AZUL_API, latampass: LATAM_API };
  const url = urls[program];
  const apiPatterns = patterns[program];

  const page = await context.newPage();
  const intercepted = [];

  page.on('response', async (resp) => {
    const rurl = resp.url();
    if (!apiPatterns.some((p) => rurl.includes(p))) return;
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const json = await resp.json();
      intercepted.push(...extractFlightsFromJson(json, program));
    } catch {
      /* ignore */
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await humanDelay(2000, 4000);
  } catch (err) {
    console.error(`[${program}] navigation failed: ${err.message}`);
  } finally {
    await page.close().catch(() => {});
  }

  // Dedup + limita a 5 melhores
  const unique = [];
  const byKey = new Map();
  for (const f of intercepted) {
    const k = `${f.flightNumber}-${f.milesRequired}`;
    if (!byKey.has(k)) {
      byKey.set(k, f);
      unique.push(f);
    }
  }
  unique.sort((a, b) => a.milesRequired - b.milesRequired);
  return unique.slice(0, 5).map((f) => ({
    programSlug: program,
    programName: { smiles: 'Smiles (GOL)', tudoazul: 'TudoAzul (Azul)', latampass: 'LATAM Pass' }[program],
    origin,
    destination: dest,
    date,
    cabinClass: 'economy',
    milesRequired: f.milesRequired,
    taxBrl: f.taxBrl,
    airline: f.airline,
    flightNumber: f.flightNumber,
    departureTime: f.departureTime,
    arrivalTime: f.arrivalTime,
    stops: f.stops,
    duration: f.duration,
    source: 'live_scraping',
    scrapedAt: new Date().toISOString(),
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Scraping ${origin} → [${destinations.join(', ')}] on ${date}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const allResults = [];
  const programs = ['smiles', 'tudoazul', 'latampass'];

  try {
    for (const dest of destinations) {
      // Context fresh por destino — evita acumular fingerprint demais
      const context = await browser.newContext({
        userAgent: randomUA(),
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        viewport: { width: 1366, height: 768 },
        extraHTTPHeaders: {
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      for (const program of programs) {
        try {
          const results = await scrapeOne(context, program, origin, dest, date);
          if (results.length > 0) {
            console.log(`  ✓ ${program} ${origin}-${dest}: ${results.length} flights`);
            allResults.push(...results);
          } else {
            console.log(`  ✗ ${program} ${origin}-${dest}: 0 flights`);
          }
        } catch (err) {
          console.log(`  ✗ ${program} ${origin}-${dest}: ERROR ${err.message}`);
        }
      }

      await context.close().catch(() => {});
      await humanDelay(3000, 8000); // pausa entre destinos
    }
  } finally {
    await browser.close().catch(() => {});
  }

  // POST pro webhook
  console.log(`\nPosting ${allResults.length} results to ${WEBHOOK_URL}`);
  const resp = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Scraper-Secret': WEBHOOK_SECRET || '',
    },
    body: JSON.stringify({
      source: 'github-actions',
      results: allResults,
      meta: {
        origin,
        destinations,
        date,
        runId: process.env.GITHUB_RUN_ID,
        sha: process.env.GITHUB_SHA,
      },
    }),
  });

  const body = await resp.text();
  console.log(`Webhook HTTP ${resp.status}: ${body}`);

  if (!resp.ok) process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
