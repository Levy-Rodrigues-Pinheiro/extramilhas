import logger from '../logger';

export interface CleanedFlightResult {
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
  confidence: number; // 0-100 — how confident we are in this data
}

export class DataCleanerService {

  /** Remove duplicates keeping the one with lowest miles */
  static deduplicate(flights: CleanedFlightResult[]): CleanedFlightResult[] {
    const seen = new Map<string, CleanedFlightResult>();

    for (const flight of flights) {
      const key = `${flight.programSlug}-${flight.origin}-${flight.destination}-${flight.cabinClass}-${flight.milesRequired}`;
      const existing = seen.get(key);

      if (!existing || flight.confidence > existing.confidence) {
        seen.set(key, flight);
      }
    }

    return Array.from(seen.values());
  }

  /** Validate and normalize a flight result */
  static normalize(raw: any, programSlug: string, programName: string, params: any): CleanedFlightResult | null {
    // Validate miles
    const miles = parseInt(String(raw.milesRequired || raw.miles || 0), 10);
    if (miles < 1000 || miles > 1000000) {
      logger.debug(`[Cleaner] Invalid miles: ${miles} — discarded`);
      return null;
    }

    // Validate tax
    let tax = parseFloat(String(raw.taxBrl || raw.tax || 0));
    if (isNaN(tax) || tax < 0) tax = 0;
    if (tax > 50000) tax = 0; // unreasonable tax

    // Normalize airline name
    const airline = DataCleanerService.normalizeAirline(raw.airline || '');

    // Normalize times
    const departureTime = DataCleanerService.normalizeTime(raw.departureTime || '');
    const arrivalTime = DataCleanerService.normalizeTime(raw.arrivalTime || '');

    // Calculate confidence score
    const confidence = DataCleanerService.calculateConfidence(miles, tax, airline, departureTime);

    return {
      programSlug,
      programName,
      origin: (params.origin || '').toUpperCase(),
      destination: (params.destination || '').toUpperCase(),
      date: params.date || '',
      cabinClass: DataCleanerService.normalizeCabin(raw.cabinClass || raw.cabin || params.cabinClass),
      milesRequired: miles,
      taxBrl: Math.round(tax * 100) / 100,
      airline,
      flightNumber: DataCleanerService.normalizeFlightNumber(raw.flightNumber || ''),
      departureTime,
      arrivalTime,
      stops: Math.max(0, parseInt(String(raw.stops || 0), 10)),
      duration: raw.duration || '',
      source: 'live_scraping',
      scrapedAt: new Date().toISOString(),
      confidence,
    };
  }

  static normalizeAirline(raw: string): string {
    const map: Record<string, string> = {
      'G3': 'GOL', 'GLO': 'GOL', 'gol': 'GOL',
      'AD': 'Azul', 'AZU': 'Azul', 'azul': 'Azul',
      'LA': 'LATAM', 'JJ': 'LATAM', 'TAM': 'LATAM', 'latam': 'LATAM',
      'AA': 'American', 'american': 'American',
      'TP': 'TAP', 'tap': 'TAP',
      'AF': 'Air France', 'air france': 'Air France',
    };
    return map[raw] || map[raw.toUpperCase()] || map[raw.toLowerCase()] || raw;
  }

  static normalizeCabin(raw: string): string {
    const r = (raw || '').toLowerCase();
    if (r.includes('econ') || r === 'y' || r === 'm') return 'economy';
    if (r.includes('bus') || r.includes('exec') || r === 'c' || r === 'w') return 'business';
    if (r.includes('first') || r === 'f') return 'first';
    return 'economy';
  }

  static normalizeTime(raw: string): string {
    if (!raw) return '';
    // Try to extract HH:MM from ISO string or time string
    const isoMatch = raw.match(/T(\d{2}:\d{2})/);
    if (isoMatch) return isoMatch[1];
    const timeMatch = raw.match(/(\d{2}:\d{2})/);
    if (timeMatch) return timeMatch[1];
    return raw;
  }

  static normalizeFlightNumber(raw: string): string {
    return raw.replace(/\s+/g, '').toUpperCase();
  }

  static calculateConfidence(miles: number, tax: number, airline: string, time: string): number {
    let score = 0;
    if (miles > 0) score += 40; // Has miles — most important
    if (tax > 0) score += 20;  // Has tax info
    if (airline) score += 20;   // Has airline
    if (time) score += 20;      // Has departure time
    return score;
  }
}
