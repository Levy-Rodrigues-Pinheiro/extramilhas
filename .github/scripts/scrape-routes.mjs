#!/usr/bin/env node
/**
 * Script standalone para scraping em GitHub Actions.
 *
 * Uso:
 *   node .github/scripts/scrape-routes.mjs <origin> [dest1,dest2,...] [date]
 *
 * Env vars:
 *   BACKEND_WEBHOOK_URL    — endpoint completo
 *   BACKEND_WEBHOOK_SECRET — shared secret
 *   DEBUG_DUMP_PAYLOADS    — se "true", salva 1º JSON interceptado por programa
 *                            pra diagnóstico
 */

import { chromium as baseChromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import * as fs from 'fs';

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
const WEBHOOK_SECRET = (process.env.BACKEND_WEBHOOK_SECRET || '').trim();
const DEBUG = process.env.DEBUG_DUMP_PAYLOADS === 'true';

if (!WEBHOOK_URL) {
  console.error('ERROR: BACKEND_WEBHOOK_URL env var required');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  return d.toISOString().slice(0, 10);
}
function randomUA() {
  return new UserAgent({ deviceCategory: 'desktop', platform: /^(Win|Mac|Linux)/i }).toString();
}
function humanDelay(min, max) {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

// ─── URL builders ─────────────────────────────────────────────────────────

function smilesUrl(o, d, dt) {
  return `https://www.smiles.com.br/passagens-aereas?originAirport=${o}&destinationAirport=${d}&departureDate=${dt}&adults=1&children=0&infants=0&cabinType=economic&isRoundTrip=false`;
}
function tudoazulUrl(o, d, dt) {
  const [y, m, day] = dt.split('-');
  return `https://www.voeazul.com.br/br/pt/home/selecao-de-voos?o1=${o}&d1=${d}&dd1=${day}-${m}-${y}&passengers.adults=1&r=false&cc=economy&isAward=true`;
}
function latampassUrl(o, d, dt) {
  return `https://www.latamairlines.com/br/pt/oferta-voos?origin=${o}&destination=${d}&outbound=${dt}T12:00:00.000Z&adt=1&trip=OW&cabin=Economy&redemption=true&sort=RECOMMENDED`;
}

// ─── API interception — padrões expandidos ────────────────────────────────

// Match em qualquer URL que contenha UMA dessas substrings (case-insensitive)
const ALL_API_PATTERNS = [
  'flightsearch', 'airlines/search', 'flight-search', 'search/flights',
  '/bff/', 'graphql', '/api/flights', '/api/search', '/api/availability',
  '/api/booking', '/api/offers', 'offers-search', 'redemption/search',
  'catalog/flights', 'availability', 'award', 'proxy/flight',
  'priceschedule', '/search-flights', 'searchflights', 'flightresults',
  '/rest/', '/v1/', '/v2/', '/fares/', '/flights/',
];

// Campos candidatos a "milhas" — em 3 programas + int'l variações
const MILES_KEYS = [
  'miles', 'milhas', 'points', 'pointsAmount', 'pointsRequired',
  'milesRequired', 'milesAmount', 'fareMiles', 'fareAmount',
  'sumOfMiles', 'totalMiles', 'totalPoints', 'awardMiles',
  'amount', 'value', 'price', 'fare', 'cost',
  // LATAM-specific
  'redemption', 'redemptionPoints', 'paxFareMilesAmount',
  // Smiles-specific
  'award', 'awardFare',
];

/** Extrai "voos" de qualquer JSON, com log de diagnóstico. */
function extractFlightsFromJson(json, program, stats) {
  const flights = [];
  const seen = new Set();
  stats.objectsVisited = (stats.objectsVisited || 0) + 0;

  function walk(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 20) return;
    stats.objectsVisited++;
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, depth + 1));
      return;
    }

    // Qualquer key com valor num que pareça milhas (1k-2M)
    const matchedKey = MILES_KEYS.find((k) => {
      const v = node[k];
      if (typeof v === 'number' && v >= 1000 && v <= 2_000_000) return true;
      // Às vezes vem string tipo "120.000" ou "120,000"
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(/[.,]/g, ''));
        if (!isNaN(n) && n >= 1000 && n <= 2_000_000) return true;
      }
      return false;
    });

    if (matchedKey) {
      const rawMiles = node[matchedKey];
      const miles =
        typeof rawMiles === 'number'
          ? rawMiles
          : parseFloat(String(rawMiles).replace(/[.,]/g, ''));
      const key = `${miles}-${node.flightNumber || node.number || ''}-${node.departure || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        stats.matchedKeys = stats.matchedKeys || {};
        stats.matchedKeys[matchedKey] = (stats.matchedKeys[matchedKey] || 0) + 1;
        flights.push({
          milesRequired: miles,
          taxBrl: node.taxes || node.tax || node.taxAmount || node.taxes_BRL || 0,
          airline: node.airline || node.carrierCode || node.operatingCarrier || node.marketingCarrier || '',
          flightNumber: node.flightNumber || node.number || node.flightCode || '',
          departureTime: node.departureTime || node.departure || node.departureDateTime || '',
          arrivalTime: node.arrivalTime || node.arrival || node.arrivalDateTime || '',
          stops: typeof node.stops === 'number' ? node.stops : (Array.isArray(node.segments) ? Math.max(0, node.segments.length - 1) : 0),
          duration: node.duration || node.flightDuration || '',
        });
      }
    }

    Object.values(node).forEach((v) => walk(v, depth + 1));
  }

  walk(json);
  return flights;
}

// ─── Scraping de uma rota ─────────────────────────────────────────────────

async function scrapeOne(context, program, origin, dest, date) {
  const url = { smiles: smilesUrl, tudoazul: tudoazulUrl, latampass: latampassUrl }[program](origin, dest, date);

  const page = await context.newPage();
  const intercepted = [];
  const apiHits = [];
  const stats = { jsonResponses: 0, nonJsonResponses: 0, statusCodes: {} };

  page.on('response', async (resp) => {
    const rurl = resp.url();
    const status = resp.status();
    stats.statusCodes[status] = (stats.statusCodes[status] || 0) + 1;

    // Só processa URLs que casam com algum pattern
    const isApi = ALL_API_PATTERNS.some((p) => rurl.toLowerCase().includes(p));
    if (!isApi) return;

    apiHits.push({ url: rurl.substring(0, 150), status });
    try {
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('json')) {
        stats.nonJsonResponses++;
        return;
      }
      const json = await resp.json();
      stats.jsonResponses++;

      // Dump primeiro JSON pra diagnóstico
      if (DEBUG && !stats.dumped) {
        const dumpPath = `/tmp/payload-${program}-${origin}-${dest}.json`;
        try {
          fs.writeFileSync(dumpPath, JSON.stringify(json, null, 2).substring(0, 200000));
          console.log(`    [debug] dumped ${dumpPath}`);
          stats.dumped = true;
        } catch {}
      }

      const found = extractFlightsFromJson(json, program, stats);
      intercepted.push(...found);
    } catch {
      /* ignore */
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});
    await humanDelay(3000, 6000);
  } catch (err) {
    console.log(`    nav error: ${err.message.substring(0, 80)}`);
  } finally {
    await page.close().catch(() => {});
  }

  // Log diagnóstico rico — crítico pra saber por que 0 flights
  const statusSummary = Object.entries(stats.statusCodes).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`    [diag] apiHits=${apiHits.length} jsonResp=${stats.jsonResponses} statuses=[${statusSummary}] matched=${JSON.stringify(stats.matchedKeys || {})}`);
  if (apiHits.length > 0 && intercepted.length === 0) {
    // Só mostra URLs de API se zero flights — pra não poluir quando funciona
    apiHits.slice(0, 3).forEach((h) => console.log(`      api: [${h.status}] ${h.url}`));
  }

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
  console.log(`Webhook URL: ${WEBHOOK_URL.substring(0, 80)}...`);
  console.log(`Secret length: ${WEBHOOK_SECRET.length} chars (first 4: ${WEBHOOK_SECRET.substring(0, 4)})`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const allResults = [];
  const programs = ['smiles', 'tudoazul', 'latampass'];

  try {
    for (const dest of destinations) {
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
        const label = `${program} ${origin}-${dest}`;
        try {
          const results = await scrapeOne(context, program, origin, dest, date);
          if (results.length > 0) {
            console.log(`  ✓ ${label}: ${results.length} flights`);
            allResults.push(...results);
          } else {
            console.log(`  ✗ ${label}: 0 flights`);
          }
        } catch (err) {
          console.log(`  ✗ ${label}: ERROR ${err.message}`);
        }
      }

      await context.close().catch(() => {});
      await humanDelay(3000, 6000);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  console.log(`\nPosting ${allResults.length} results to webhook...`);
  const resp = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Scraper-Secret': WEBHOOK_SECRET,
      'ngrok-skip-browser-warning': 'true',
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
  console.log(`Webhook HTTP ${resp.status}: ${body.substring(0, 300)}`);

  // Exit 0 mesmo com 0 flights — não falha o job, só loga.
  // Só falha se webhook HTTP >= 400 (problema de integração).
  if (!resp.ok) {
    console.error(`\n❌ Webhook rejected — check BACKEND_WEBHOOK_SECRET matches backend .env`);
    process.exit(1);
  }
  if (allResults.length === 0) {
    console.log(`\n⚠️  0 flights across all scrapes — Akamai likely blocked or API shape changed`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
