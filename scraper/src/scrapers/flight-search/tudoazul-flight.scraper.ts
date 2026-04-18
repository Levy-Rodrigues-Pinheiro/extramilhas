import logger from '../../logger';
import { FlightAwardResult } from '../../types';
import { humanDelay, dismissBanners } from './stealth';
import { acquirePage } from './browser-pool';
import {
  extractMilesFromText,
  extractPricesFromText,
  extractTimesFromText,
  parseApiResponse,
  ExtractedFlight,
} from './extractors';

// ---------------------------------------------------------------------------
// Multiple URL strategies for TudoAzul / Voe Azul
// ---------------------------------------------------------------------------
function buildSearchUrls(params: {
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
}): string[] {
  const cabinMap: Record<string, string> = {
    economy: 'Economy',
    business: 'Business',
    first: 'Business',
  };
  const cabin = cabinMap[params.cabinClass] || 'Economy';

  return [
    // Strategy 1: Standard Voe Azul search
    `https://www.voeazul.com.br/br/pt/home/selecao-de-voos` +
      `?c[0].ds=${params.origin}` +
      `&c[0].as=${params.destination}` +
      `&c[0].dt=${params.date}` +
      `&p[0].t=ADT&p[0].c=1` +
      `&f.dl=3&f.dr=3` +
      `&cc=${cabin}` +
      `&rd=false`,
    // Strategy 2: TudoAzul portal
    `https://www.tudoazul.com/br/pt/acumule-e-use/comprar-passagens` +
      `?origin=${params.origin}` +
      `&destination=${params.destination}` +
      `&departure=${params.date}` +
      `&adults=1&children=0&infants=0` +
      `&cabin=${cabin}` +
      `&redemption=true`,
    // Strategy 3: Alternative path
    `https://www.voeazul.com.br/br/pt/home/selecao-de-voos` +
      `?c[0].ds=${params.origin}` +
      `&c[0].as=${params.destination}` +
      `&c[0].dt=${params.date}` +
      `&p[0].t=ADT&p[0].c=1` +
      `&cc=${cabin}` +
      `&rd=false&rp=true`,
  ];
}

// ---------------------------------------------------------------------------
// Selectors to wait for (fallbacks)
// ---------------------------------------------------------------------------
const RESULT_SELECTORS = [
  '[class*="flight-list"]',
  '[class*="FlightList"]',
  '[data-testid*="flight"]',
  '[class*="resultado"]',
  '[class*="card"]',
  '[class*="segment"]',
  '[class*="option"]',
  '[class*="itinerary"]',
  '[class*="journey"]',
  '[class*="search-result"]',
  '[class*="points"]',
  '[class*="pontos"]',
];

// ---------------------------------------------------------------------------
// API URL patterns to intercept
// ---------------------------------------------------------------------------
const API_PATTERNS = [
  '/api/flights',
  '/api/search',
  'flight-search',
  'search/flights',
  '/availability',
  'graphql',
  '/bff/',
  'booking-flow',
  '/v1/flights',
  '/v2/flights',
];

export async function searchTudoAzulFlights(params: {
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
}): Promise<FlightAwardResult[]> {
  const { page, release } = await acquirePage('tudoazul');
  let success = false;

  try {

    // ------------------------------------------------------------------
    // Intercept API responses (the primary data source)
    // ------------------------------------------------------------------
    const interceptedFlights: ExtractedFlight[] = [];
    const rawApiResponses: any[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      const isApiCall = API_PATTERNS.some(p => url.includes(p));
      if (!isApiCall) return;

      try {
        const contentType = response.headers()['content-type'] || '';
        if (!contentType.includes('json')) return;

        const json = await response.json();
        rawApiResponses.push(json);

        const parsed = parseApiResponse(json, 'tudoazul');
        if (parsed.length > 0) {
          interceptedFlights.push(...parsed);
          logger.info(`[TudoAzul] Intercepted ${parsed.length} flights from API: ${url}`);
        }
      } catch {
        // Not all responses are JSON -- ignore parse errors
      }
    });

    // ------------------------------------------------------------------
    // Try multiple URL strategies
    // ------------------------------------------------------------------
    const urls = buildSearchUrls(params);
    let navigated = false;

    for (const url of urls) {
      try {
        logger.info(`[TudoAzul] Trying URL: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        navigated = true;

        // Wait for network to settle (API calls happen here)
        try {
          await page.waitForLoadState('networkidle', { timeout: 15000 });
        } catch {
          // networkidle may timeout on heavy pages -- that is fine
        }

        break;
      } catch (err: any) {
        logger.warn(`[TudoAzul] URL failed: ${err.message}`);
      }
    }

    if (!navigated) {
      throw new Error('All URL strategies failed');
    }

    // Dismiss cookie/consent banners
    await dismissBanners(page);

    // Try to click "Usar pontos" (use points) toggle if present
    try {
      const pointsToggle = await page.$(
        '[class*="points"], [data-testid*="points"], button:has-text("pontos"), label:has-text("pontos")',
      );
      if (pointsToggle) {
        await pointsToggle.click();
        await humanDelay(2000, 3000);
        logger.info('[TudoAzul] Clicked points toggle');
      }
    } catch {
      // Toggle may not exist or already active
    }

    // Wait for results with fallback selectors
    for (const sel of RESULT_SELECTORS) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        logger.info(`[TudoAzul] Found results with selector: ${sel}`);
        break;
      } catch {
        // Try next selector
      }
    }

    // Extra time for lazy-loaded content
    await humanDelay(3000, 5000);

    // ------------------------------------------------------------------
    // If API interception found data, use that (most reliable)
    // ------------------------------------------------------------------
    if (interceptedFlights.length > 0) {
      logger.info(`[TudoAzul] Using ${interceptedFlights.length} flights from API interception`);
      success = true;
      return interceptedFlights.map((f) => ({
        programSlug: 'tudoazul',
        programName: 'TudoAzul (Azul)',
        origin: params.origin,
        destination: params.destination,
        date: params.date,
        cabinClass: params.cabinClass,
        milesRequired: f.milesRequired,
        taxBrl: f.taxBrl || 0,
        airline: f.airline || 'Azul',
        flightNumber: f.flightNumber || '',
        departureTime: f.departureTime || '',
        arrivalTime: f.arrivalTime || '',
        stops: f.stops ?? 0,
        duration: '',
        source: 'live_scraping' as const,
        scrapedAt: new Date().toISOString(),
      }));
    }

    // ------------------------------------------------------------------
    // Fallback: DOM extraction
    // ------------------------------------------------------------------
    const results = await page.evaluate(() => {
      const flights: any[] = [];

      const cards = document.querySelectorAll(
        '[class*="flight"], [class*="Flight"], [data-testid*="flight"], ' +
          '[class*="resultado"], [class*="card"], [class*="segment"], ' +
          '[class*="option"], [class*="itinerary"], [class*="journey"]',
      );

      cards.forEach((card) => {
        const text = card.textContent || '';
        const pointsMatch =
          text.match(/(\d[\d.]*)\s*(pontos|pts|points)/i) ||
          text.match(/(\d[\d.]*)\s*(milhas|miles)/i);
        const taxMatch = text.match(/R\$\s*([\d.,]+)/);
        const timeMatch = text.match(/(\d{2}:\d{2})/g);
        const flightNumMatch = text.match(/(AD)\s*(\d{3,4})/);
        const stopsMatch = text.match(/(\d)\s*parada/i) || text.match(/direto/i);
        const durationMatch = text.match(/(\d{1,2})h\s*(\d{1,2})?m?/);

        if (pointsMatch) {
          const points = parseInt(pointsMatch[1].replace(/\./g, ''), 10);
          if (points > 1000 && points < 1000000) {
            flights.push({
              milesRequired: points,
              taxBrl: taxMatch
                ? parseFloat(taxMatch[1].replace('.', '').replace(',', '.'))
                : 0,
              departureTime: timeMatch?.[0] || '',
              arrivalTime: timeMatch?.[1] || '',
              flightNumber: flightNumMatch
                ? `${flightNumMatch[1]}${flightNumMatch[2]}`
                : '',
              stops: stopsMatch
                ? stopsMatch[0].match(/direto/i)
                  ? 0
                  : parseInt(stopsMatch[1], 10)
                : 0,
              duration: durationMatch
                ? `${durationMatch[1]}h${durationMatch[2] ? durationMatch[2] + 'm' : ''}`
                : '',
            });
          }
        }
      });

      return flights;
    });

    // ------------------------------------------------------------------
    // Fallback 2: text-based extraction using extractors
    // ------------------------------------------------------------------
    if (results.length === 0) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      const miles = extractMilesFromText(bodyText);
      const prices = extractPricesFromText(bodyText);
      const times = extractTimesFromText(bodyText);

      for (let i = 0; i < miles.length; i++) {
        results.push({
          milesRequired: miles[i],
          taxBrl: prices[i] || 0,
          departureTime: times[i * 2] || '',
          arrivalTime: times[i * 2 + 1] || '',
          flightNumber: '',
          stops: 0,
          duration: '',
        });
      }
    }

    logger.info(`[TudoAzul] Extracted ${results.length} flights (DOM/text fallback)`);
    if (results.length > 0) success = true;

    return results.map((f: any) => ({
      programSlug: 'tudoazul',
      programName: 'TudoAzul (Azul)',
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      cabinClass: params.cabinClass,
      milesRequired: f.milesRequired,
      taxBrl: f.taxBrl || 0,
      airline: 'Azul',
      flightNumber: f.flightNumber || '',
      departureTime: f.departureTime || '',
      arrivalTime: f.arrivalTime || '',
      stops: f.stops ?? 0,
      duration: f.duration || '',
      source: 'live_scraping' as const,
      scrapedAt: new Date().toISOString(),
    }));
  } catch (error: any) {
    logger.error(`[TudoAzul] Scraping failed: ${error.message}`);
    return [];
  } finally {
    await release(success);
  }
}
