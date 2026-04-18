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
// Multiple URL strategies for Smiles
// ---------------------------------------------------------------------------
function buildSearchUrls(params: {
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
}): string[] {
  const cabinMap: Record<string, string> = {
    economy: 'economic',
    business: 'executive',
    first: 'first',
  };
  const cabinType = cabinMap[params.cabinClass] || 'economic';

  return [
    // Strategy 1: Standard search page
    `https://www.smiles.com.br/passagens-aereas` +
      `?originAirport=${params.origin}` +
      `&destinationAirport=${params.destination}` +
      `&departureDate=${params.date}` +
      `&adults=1&children=0&infants=0` +
      `&cabinType=${cabinType}` +
      `&isRoundTrip=false`,
    // Strategy 2: Emission page
    `https://www.smiles.com.br/emissao` +
      `?originAirport=${params.origin}` +
      `&destinationAirport=${params.destination}` +
      `&departureDate=${params.date}` +
      `&adults=1&children=0&infants=0` +
      `&cabinType=${cabinType}` +
      `&isRoundTrip=false`,
    // Strategy 3: MFE route
    `https://www.smiles.com.br/mfe/emissao-passagem` +
      `?originAirport=${params.origin}` +
      `&destinationAirport=${params.destination}` +
      `&departureDate=${params.date}` +
      `&adults=1&children=0&infants=0` +
      `&cabinType=${cabinType}` +
      `&isRoundTrip=false`,
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
  '[class*="card-voo"]',
  '[class*="CardFlight"]',
  '[class*="offer-card"]',
  '[class*="trip-option"]',
  '[class*="segment"]',
  '[class*="search-result"]',
  '[class*="miles"]',
];

// ---------------------------------------------------------------------------
// API URL patterns to intercept
// ---------------------------------------------------------------------------
const API_PATTERNS = [
  'flightsearch',
  'airlines/search',
  'flight-search',
  'search/flights',
  '/api/flights',
  '/api/search',
  'graphql',
  '/bff/',
];

export async function searchSmilesFlights(params: {
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
}): Promise<FlightAwardResult[]> {
  const { page, release } = await acquirePage('smiles');
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

        const parsed = parseApiResponse(json, 'smiles');
        if (parsed.length > 0) {
          interceptedFlights.push(...parsed);
          logger.info(`[Smiles] Intercepted ${parsed.length} flights from API: ${url}`);
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
        logger.info(`[Smiles] Trying URL: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        navigated = true;

        // Wait for network to settle (API calls happen here)
        try {
          await page.waitForLoadState('networkidle', { timeout: 15000 });
        } catch {
          // networkidle may timeout on heavy pages -- that is fine
        }

        break; // Navigation succeeded, stop trying URLs
      } catch (err: any) {
        logger.warn(`[Smiles] URL failed: ${err.message}`);
      }
    }

    if (!navigated) {
      throw new Error('All URL strategies failed');
    }

    // Dismiss cookie/consent banners
    await dismissBanners(page);

    // Wait for results with fallback selectors
    for (const sel of RESULT_SELECTORS) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        logger.info(`[Smiles] Found results with selector: ${sel}`);
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
      logger.info(`[Smiles] Using ${interceptedFlights.length} flights from API interception`);
      success = true;
      return interceptedFlights.map((f) => ({
        programSlug: 'smiles',
        programName: 'Smiles (GOL)',
        origin: params.origin,
        destination: params.destination,
        date: params.date,
        cabinClass: params.cabinClass,
        milesRequired: f.milesRequired,
        taxBrl: f.taxBrl || 0,
        airline: f.airline || 'GOL',
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

      // Look for flight cards on the page
      const cards = document.querySelectorAll(
        '[class*="flight"], [class*="Flight"], [data-testid*="flight"], ' +
          '[class*="resultado"], [class*="card-voo"], [class*="CardFlight"], ' +
          '[class*="offer-card"], [class*="trip-option"], [class*="segment"]',
      );

      cards.forEach((card) => {
        const text = card.textContent || '';
        const milesMatch = text.match(/(\d[\d.]*)\s*(milhas|miles|mi\b)/i);
        const taxMatch = text.match(/R\$\s*([\d.,]+)/);
        const timeMatch = text.match(/(\d{2}:\d{2})/g);
        const airlineEl = card.querySelector('[class*="airline"], [class*="company"], img[alt]');
        const flightNumMatch = text.match(/([A-Z]{2})\s*(\d{3,4})/);
        const stopsMatch = text.match(/(\d)\s*parada/i) || text.match(/direto/i);
        const durationMatch = text.match(/(\d{1,2})h\s*(\d{1,2})?m?/);

        if (milesMatch) {
          const miles = parseInt(milesMatch[1].replace(/\./g, ''), 10);
          if (miles > 1000 && miles < 1000000) {
            flights.push({
              milesRequired: miles,
              taxBrl: taxMatch
                ? parseFloat(taxMatch[1].replace('.', '').replace(',', '.'))
                : 0,
              departureTime: timeMatch?.[0] || '',
              arrivalTime: timeMatch?.[1] || '',
              airline: airlineEl?.getAttribute('alt') || 'GOL',
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
          airline: 'GOL',
          flightNumber: '',
          stops: 0,
          duration: '',
        });
      }
    }

    logger.info(`[Smiles] Extracted ${results.length} flights (DOM/text fallback)`);

    if (results.length > 0) success = true;

    return results.map((f: any) => ({
      programSlug: 'smiles',
      programName: 'Smiles (GOL)',
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      cabinClass: params.cabinClass,
      milesRequired: f.milesRequired,
      taxBrl: f.taxBrl || 0,
      airline: f.airline || 'GOL',
      flightNumber: f.flightNumber || '',
      departureTime: f.departureTime || '',
      arrivalTime: f.arrivalTime || '',
      stops: f.stops ?? 0,
      duration: f.duration || '',
      source: 'live_scraping' as const,
      scrapedAt: new Date().toISOString(),
    }));
  } catch (error: any) {
    logger.error(`[Smiles] Scraping failed: ${error.message}`);
    return [];
  } finally {
    await release(success);
  }
}
