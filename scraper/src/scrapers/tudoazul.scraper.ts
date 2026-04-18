import { RawOffer } from '../types';
import { BaseScraper } from './base.scraper';

/**
 * TudoAzul scraper — Azul Airlines loyalty program.
 *
 * Uses Playwright to scrape https://www.tudoazul.com.br for points purchase
 * offers. Falls back to estimated pricing when live scraping fails.
 */
export class TudoAzulScraper extends BaseScraper {
  readonly programSlug = 'tudoazul';
  readonly programName = 'TudoAzul';
  readonly baseUrl = 'https://www.tudoazul.com.br';

  async scrapeOffers(): Promise<RawOffer[]> {
    this.logger.info('[TudoAzul] Starting scraping...');
    const offers: RawOffer[] = [];

    try {
      const browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'User-Agent': this.getRandomUserAgent() });

      // Scrape purchase page
      await page.goto('https://www.tudoazul.com.br/pontos/comprar', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await this.randomDelay();

      // Try to extract offer data from the page
      const priceData = await page.evaluate(() => {
        const results: Array<{ title: string; miles: number; price: number; url: string }> = [];

        const cards = document.querySelectorAll(
          '[class*="card"], [class*="offer"], [class*="PromoCard"], [class*="produto"], [class*="package"], [data-offer]',
        );
        cards.forEach((card) => {
          const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="titulo"], [class*="name"]');
          const priceEl = card.querySelector('[class*="price"], [class*="preco"], [class*="valor"], [class*="amount"]');
          const pointsEl = card.querySelector('[class*="points"], [class*="pontos"], [class*="quantity"], [class*="miles"]');

          if (titleEl && priceEl) {
            const priceText = priceEl.textContent || '';
            const priceMatch = priceText.match(/[\d.,]+/);
            const pointsText = pointsEl?.textContent || titleEl?.textContent || '';
            const pointsMatch = pointsText.match(/(\d[\d.]*)/);

            if (priceMatch && pointsMatch) {
              const price = parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.'));
              const points = parseInt(pointsMatch[1].replace(/\./g, ''), 10);
              if (price > 0 && points > 0) {
                results.push({
                  title: (titleEl.textContent || '').trim(),
                  miles: points,
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
            title: item.title || 'TudoAzul - Compra de Pontos',
            description: `Compre ${item.miles.toLocaleString('pt-BR')} pontos TudoAzul por R$${item.price.toFixed(2)}`,
            miles: item.miles,
            priceBrl: item.price,
            url: item.url,
            type: 'PURCHASE',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
        this.logger.info(`[TudoAzul] Extracted ${offers.length} real offers`);
      } else {
        // Fallback: estimated CPM ~22 per 1000 points
        this.logger.warn('[TudoAzul] No offers extracted from DOM, using estimated data');
        offers.push({
          title: 'TudoAzul - Compra de pontos com bonus',
          description: 'Compre pontos TudoAzul. Preco estimado baseado em dados recentes.',
          miles: 10_000,
          priceBrl: 220,
          url: 'https://www.tudoazul.com.br/pontos/comprar',
          type: 'PURCHASE',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          metadata: { estimated: true },
        });
      }

      await browser.close();
    } catch (error) {
      this.logger.error(`[TudoAzul] Scraping failed: ${(error as Error).message}`);
      // Return fallback estimated data
      offers.push({
        title: 'TudoAzul - Compra de pontos',
        description: 'Dados estimados - scraping indisponivel temporariamente.',
        miles: 10_000,
        priceBrl: 220,
        url: 'https://www.tudoazul.com.br/pontos/comprar',
        type: 'PURCHASE',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        metadata: { estimated: true, reason: 'scraping_failed' },
      });
    }

    return offers;
  }
}
