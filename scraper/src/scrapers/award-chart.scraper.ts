import { BaseScraper } from './base.scraper';
import { RawOffer } from '../types';

export interface AwardChartEntry {
  programSlug: string;
  origin: string;
  destination: string;
  destinationName: string;
  country: string;
  cabinClass: string;
  milesRequired: number;
  isDirectFlight: boolean;
}

/**
 * Award Chart scraper.
 *
 * Attempts to extract award chart (miles table / mapa de milhas) data from
 * loyalty program websites. This scraper does not return regular RawOffer
 * objects — it populates award chart entries that are stored separately.
 *
 * Because award charts are rarely exposed in a machine-readable format on
 * these sites, the primary data source is manual entry via admin endpoints.
 * This scraper serves as a best-effort automated supplement.
 */
export class AwardChartScraper extends BaseScraper {
  readonly programSlug = 'award-charts';
  readonly programName = 'Award Charts';
  readonly baseUrl = 'https://www.smiles.com.br';

  // This scraper doesn't return regular offers — it updates award_charts data
  // It's called separately from the main scraping cycle
  async scrapeOffers(): Promise<RawOffer[]> {
    this.logger.info('[AwardChart] Award chart scraping is handled via scrapeAwardCharts()');
    this.logger.info('[AwardChart] Use POST /admin/scraper/award-charts to trigger award chart updates');
    return [];
  }

  /**
   * Attempt to scrape award chart data from loyalty program websites.
   * Called by the daily cron job.
   */
  async scrapeAwardCharts(): Promise<AwardChartEntry[]> {
    const results: AwardChartEntry[] = [];
    this.logger.info('[AwardChart] Starting award chart scraping...');

    // Attempt to scrape from Smiles award chart / mapa de milhas
    try {
      const browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'User-Agent': this.getRandomUserAgent() });

      // Try Smiles award chart page
      await page.goto('https://www.smiles.com.br/mapa-de-milhas', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await this.randomDelay(3000, 6000);

      // Try to extract miles table data
      const tableData = await page.evaluate(() => {
        const rows: Array<{ name: string; miles: number }> = [];

        // Try common table selectors
        document
          .querySelectorAll('table tr, [class*="route"], [class*="destination"], [class*="rota"]')
          .forEach((el) => {
            const text = el.textContent || '';
            // Look for patterns like "Miami 50.000" or "MIA 50000"
            const match = text.match(
              /([A-Za-z\u00C0-\u024F\s]+)\s+(\d[\d.]*)\s*(milhas|miles|pontos)?/i,
            );
            if (match) {
              rows.push({
                name: match[1].trim(),
                miles: parseInt(match[2].replace(/\./g, ''), 10),
              });
            }
          });

        return rows;
      });

      if (tableData.length > 0) {
        this.logger.info(`[AwardChart] Found ${tableData.length} entries from Smiles`);

        for (const entry of tableData) {
          results.push({
            programSlug: 'smiles',
            origin: 'GRU',
            destination: '',
            destinationName: entry.name,
            country: '',
            cabinClass: 'ECONOMY',
            milesRequired: entry.miles,
            isDirectFlight: false,
          });
        }
      } else {
        this.logger.warn(
          '[AwardChart] No data extracted from pages. Use admin panel for manual entry.',
        );
      }

      await browser.close();
    } catch (error) {
      this.logger.error(`[AwardChart] Scraping failed: ${(error as Error).message}`);
      this.logger.info('[AwardChart] Falling back to manually entered data in the database.');
    }

    return results;
  }
}
