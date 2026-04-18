/**
 * Smart data extractors -- try multiple strategies to find miles/price data
 */

export interface ExtractedFlight {
  milesRequired: number;
  taxBrl: number;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  stops: number;
  cabin: string;
}

/** Extract miles from any text content */
export function extractMilesFromText(text: string): number[] {
  const miles: number[] = [];

  // Pattern: "50.000 milhas" or "50000 miles" or "50,000 mi"
  const patterns = [
    /(\d{1,3}(?:\.\d{3})+)\s*(?:milhas|miles|mi\b|pontos|pts)/gi,
    /(\d{4,6})\s*(?:milhas|miles|mi\b|pontos|pts)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1].replace(/\./g, '').replace(/,/g, ''), 10);
      if (num >= 3000 && num <= 500000) miles.push(num);
    }
  }

  return [...new Set(miles)].sort((a, b) => a - b);
}

/** Extract BRL prices from text */
export function extractPricesFromText(text: string): number[] {
  const prices: number[] = [];

  const patterns = [
    /R\$\s*([\d.,]+)/g,
    /BRL\s*([\d.,]+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const cleaned = match[1].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      if (num > 10 && num < 100000) prices.push(num);
    }
  }

  return [...new Set(prices)].sort((a, b) => a - b);
}

/** Extract times (HH:MM) from text */
export function extractTimesFromText(text: string): string[] {
  const matches = text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/g) || [];
  return [...new Set(matches)];
}

/** Extract airline codes from text */
export function extractAirlineFromText(text: string): string {
  const airlines: Record<string, string> = {
    'gol': 'GOL', 'g3': 'GOL',
    'azul': 'Azul', 'ad': 'Azul',
    'latam': 'LATAM', 'la': 'LATAM', 'jj': 'LATAM',
    'american': 'American Airlines', 'aa': 'American Airlines',
    'tap': 'TAP', 'tp': 'TAP',
    'air france': 'Air France', 'af': 'Air France',
    'emirates': 'Emirates', 'ek': 'Emirates',
    'copa': 'Copa Airlines', 'cm': 'Copa Airlines',
    'avianca': 'Avianca', 'av': 'Avianca',
  };

  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(airlines)) {
    if (lower.includes(key)) return value;
  }
  return '';
}

/** Parse intercepted API response (generic structure) */
export function parseApiResponse(data: any, programSlug: string): ExtractedFlight[] {
  const flights: ExtractedFlight[] = [];

  // Try various known API response structures
  const tryPaths = [
    data?.requestedFlightSegmentList?.[0]?.flightList, // Smiles
    data?.flights, // Generic
    data?.data?.flights, // Wrapped
    data?.data, // Simple array
    data?.results, // Results wrapper
    data?.itineraries, // Itineraries pattern
    data?.outbound?.flights, // Outbound pattern
  ];

  for (const flightList of tryPaths) {
    if (!Array.isArray(flightList) || flightList.length === 0) continue;

    for (const flight of flightList) {
      // Try to find miles in various field locations
      const miles = flight.miles
        || flight.fareList?.[0]?.miles
        || flight.fare?.miles
        || flight.price?.miles
        || flight.price?.points
        || flight.points
        || flight.fare?.points
        || flight.cabins?.[0]?.miles
        || 0;

      if (miles <= 0) continue;

      const tax = flight.fareList?.[0]?.money
        || flight.fare?.tax
        || flight.price?.tax
        || flight.tax
        || flight.boardingTax
        || 0;

      flights.push({
        milesRequired: miles,
        taxBrl: typeof tax === 'number' ? tax : parseFloat(tax) || 0,
        airline: flight.airline?.code || flight.carrier || flight.airlineCode || '',
        flightNumber: `${flight.airline?.code || ''}${flight.flightNumber || flight.number || ''}`,
        departureTime: flight.departure?.date || flight.departureDate || flight.legList?.[0]?.departureDate || '',
        arrivalTime: flight.arrival?.date || flight.arrivalDate || flight.legList?.[flight.legList?.length - 1]?.arrivalDate || '',
        stops: (flight.legList?.length || flight.stops || 1) - 1,
        cabin: flight.cabin || flight.cabinClass || 'economy',
      });
    }

    if (flights.length > 0) break; // Found data, stop trying paths
  }

  return flights;
}
