import { BaseScraper } from './base.scraper';
import { EsferaScraper } from './esfera.scraper';
import { LatamPassScraper } from './latampass.scraper';
import { LiveloScraper } from './livelo.scraper';
import { SmilesScaper } from './smiles.scraper';
import { TudoAzulScraper } from './tudoazul.scraper';

/**
 * Registry mapping program slugs to their scraper instances.
 * The slug must match the `slug` column in the `loyalty_programs` table.
 */
export const scrapers: Record<string, BaseScraper> = {
  smiles: new SmilesScaper(),
  livelo: new LiveloScraper(),
  tudoazul: new TudoAzulScraper(),
  latampass: new LatamPassScraper(),
  esfera: new EsferaScraper(),
};

/**
 * Returns the scraper for a given program slug, or null if not found.
 */
export function getScraper(programSlug: string): BaseScraper | null {
  return scrapers[programSlug] ?? null;
}

/**
 * Returns all registered program slugs.
 */
export function getAllProgramSlugs(): string[] {
  return Object.keys(scrapers);
}
