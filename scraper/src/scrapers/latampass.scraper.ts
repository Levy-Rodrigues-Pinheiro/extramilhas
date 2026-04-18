import { RawOffer } from '../types';
import { BaseScraper } from './base.scraper';

/**
 * LATAM Pass scraper — LATAM Airlines loyalty program.
 *
 * Uses Playwright to scrape https://www.latampass.com.br for miles purchase
 * offers. Falls back to estimated pricing when live scraping fails.
 */
export class LatamPassScraper extends BaseScraper {
  readonly programSlug = 'latampass';
  readonly programName = 'LATAM Pass';
  readonly baseUrl = 'https://www.latampass.com.br';

  async scrapeOffers(): Promise<RawOffer[]> {
    this.logger.info('[LatamPass] Starting scraping...');
    const offers: RawOffer[] = [];

    try {
      const browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'User-Agent': this.getRandomUserAgent() });

      // Scrape purchase page
      await page.goto('https://www.latampass.com.br/pt/comprar-milhas', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await this.randomDelay();

      // Try to extract offer data from the page
      const priceData = await page.evaluate(() => {
        const results: Array<{ title: string; miles: number; price: number; url: string }> = [];

        const cards = document.querySelectorAll(
          '[class*="card"], [class*="offer"], [class*="PromoSection"], [class*="produto"], [class*="package"], [class*="promo"], [data-testid="promo"]',
        );
        cards.forEach((card) => {
          const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="titulo"], [class*="name"]');
          const priceEl = card.querySelector('[class*="price"], [class*="preco"], [class*="valor"], [class*="amount"]');
          const milesEl = card.querySelector('[class*="miles"], [class*="milhas"], [class*="quantity"], [class*="points"]');

          if (titleEl && priceEl) {
            const priceText = priceEl.textContent || '';
            const priceMatch = priceText.match(/[\d.,]+/);
            const milesText = milesEl?.textContent || titleEl?.textContent || '';
            const milesMatch = milesText.match(/(\d[\d.]*)/);

            if (priceMatch && milesMatch) {
              const price = parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.'));
              const miles = parseInt(milesMatch[1].replace(/\./g, ''), 10);
              if (price > 0 && miles > 0) {
                results.push({
                  title: (titleEl.textContent || '').trim(),
                  miles,
                  price,
                  url: window.location.href,
                });
              }
            }
          }
        });

        return results;
      });

      if (priceData.length > 0) {
        for (const item of priceData) {
          offers.push({
            title: item.title || 'LATAM Pass - Compra de Milhas',
            description: `Compre ${item.miles.toLocaleString('pt-BR')} milhas LATAM Pass por R$${item.price.toFixed(2)}`,
            miles: item.miles,
            priceBrl: item.price,
            url: item.url,
            type: 'PURCHASE',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
        this.logger.info(`[LatamPass] Extracted ${offers.length} real offers`);
      } else {
        // Fallback: estimated CPM ~25 per 1000 miles
        this.logger.warn('[LatamPass] No offers extracted from DOM, using estimated data');
        offers.push({
          title: 'LATAM Pass - Compra de milhas com bonus',
          description: 'Compre milhas LATAM Pass. Preco estimado baseado em dados recentes.',
          miles: 10_000,
          priceBrl: 250,
          url: 'https://www.latampass.com.br/pt/comprar-milhas',
          type: 'PURCHASE',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          metadata: { estimated: true },
        });
      }

      await browser.close();
    } catch (error) {
      this.logger.error(`[LatamPass] Scraping failed: ${(error as Error).message}`);
      // Return fallback estimated data
      offers.push({
        title: 'LATAM Pass - Compra de milhas',
        description: 'Dados estimados - scraping indisponivel temporariamente.',
        miles: 10_000,
        priceBrl: 250,
        url: 'https://www.latampass.com.br/pt/comprar-milhas',
        type: 'PURCHASE',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        metadata: { estimated: true, reason: 'scraping_failed' },
      });
    }

    return offers;
  }
}
