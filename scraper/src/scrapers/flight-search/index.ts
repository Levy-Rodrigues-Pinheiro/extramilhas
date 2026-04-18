import { searchSmilesFlights } from './smiles-flight.scraper';
import { searchTudoAzulFlights } from './tudoazul-flight.scraper';
import { searchLatamPassFlights } from './latampass-flight.scraper';
import { FlightAwardResult } from '../../types';
import logger from '../../logger';

export async function searchAllPrograms(params: {
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
}): Promise<FlightAwardResult[]> {
  logger.info(
    `[FlightSearch] Searching all programs: ${params.origin} -> ${params.destination} on ${params.date} (${params.cabinClass})`,
  );

  const [smiles, tudoazul, latampass] = await Promise.allSettled([
    searchSmilesFlights(params),
    searchTudoAzulFlights(params),
    searchLatamPassFlights(params),
  ]);

  const results: FlightAwardResult[] = [];

  if (smiles.status === 'fulfilled') {
    results.push(...smiles.value);
    logger.info(`[FlightSearch] Smiles returned ${smiles.value.length} results`);
  } else {
    logger.error(`[FlightSearch] Smiles failed: ${smiles.reason}`);
  }

  if (tudoazul.status === 'fulfilled') {
    results.push(...tudoazul.value);
    logger.info(`[FlightSearch] TudoAzul returned ${tudoazul.value.length} results`);
  } else {
    logger.error(`[FlightSearch] TudoAzul failed: ${tudoazul.reason}`);
  }

  if (latampass.status === 'fulfilled') {
    results.push(...latampass.value);
    logger.info(`[FlightSearch] LatamPass returned ${latampass.value.length} results`);
  } else {
    logger.error(`[FlightSearch] LatamPass failed: ${latampass.reason}`);
  }

  // Sort by miles required ascending (best deals first)
  results.sort((a, b) => a.milesRequired - b.milesRequired);

  logger.info(`[FlightSearch] Total: ${results.length} flights found across all programs`);
  return results;
}
