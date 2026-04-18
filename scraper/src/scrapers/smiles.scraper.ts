import { RawOffer } from '../types';
import { BaseScraper } from './base.scraper';

/**
 * Smiles (Gol Airlines loyalty program) scraper.
 *
 * Uses Playwright to scrape https://www.smiles.com.br for miles purchase
 * offers and transfer bonuses. Falls back to estimated pricing when
 * live scraping fails.
 */
export class SmilesScaper extends BaseScraper {
  readonly programSlug = 'smiles';
  readonly programName = 'Smiles';
  readonly baseUrl = 'https://www.smiles.com.br';

  async scrapeOffers(): Promise<RawOffer[]> {
    this.logger.info('[Smiles] Starting scraping...');
    const offers: RawOffer[] = [];

    try {
      const browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'User-Agent': this.getRandomUserAgent() });

      // Scrape purchase page
      await page.goto('https://www.smiles.com.br/comprar-milhas', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await this.randomDelay();

      // Try to extract offer data from the page
      const priceData = await page.evaluate(() => {
        const results: Array<{ title: string; miles: number; price: number; url: string }> = [];

        // Try common selectors for price cards
        const cards = document.querySelectorAll(
          '[class*="card"], [class*="offer"], [class*="package"], [class*="produto"]',
        );
        cards.forEach((card) => {
          const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="titulo"]');
          const priceEl = card.querySelector('[class*="price"], [class*="preco"], [class*="valor"]');
          const milesEl = card.querySelector('[class*="miles"], [class*="milhas"], [class*="quantity"]');

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
            title: item.title || 'Smiles - Compra de Milhas',
            description: `Compre ${item.miles.toLocaleString('pt-BR')} milhas Smiles por R$${item.price.toFixed(2)}`,
            miles: item.miles,
            priceBrl: item.price,
            url: item.url,
            type: 'PURCHASE',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
        this.logger.info(`[Smiles] Extracted ${offers.length} real offers`);
      } else {
        // Fallback: use estimated current pricing
        this.logger.warn('[Smiles] No offers extracted from DOM, using estimated data');
        offers.push({
          title: 'Smiles - Compra de milhas com bonus',
          description: 'Compre milhas Smiles. Preco estimado baseado em dados recentes.',
          miles: 10_000,
          priceBrl: 250,
          url: 'https://www.smiles.com.br/comprar-milhas',
          type: 'PURCHASE',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          metadata: { estimated: true },
        });
      }

      // Also check for transfer promotions
      try {
        await page.goto('https://www.smiles.com.br/transferir-milhas', {
          waitUntil: 'domcontentloaded',
          timeout: 15_000,
        });
        await this.randomDelay();

        const transferText = await page.textContent('body');
        if (transferText && (transferText.includes('bonus') || transferText.includes('bônus'))) {
          const bonusMatch = transferText.match(/(\d+)%\s*(de\s*)?b[oô]nus/i);
          if (bonusMatch) {
            offers.push({
              title: `Smiles - Transferencia com ${bonusMatch[1]}% de bonus`,
              description: `Transfira pontos para Smiles com ${bonusMatch[1]}% de bonus.`,
              miles: 10_000,
              priceBrl: 200,
              url: 'https://www.smiles.com.br/transferir-milhas',
              type: 'TRANSFER_BONUS',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              metadata: { bonusPercent: parseInt(bonusMatch[1], 10) },
            });
          }
        }
      } catch {
        this.logger.warn('[Smiles] Transfer page scraping failed');
      }

      await browser.close();
    } catch (error) {
      this.logger.error(`[Smiles] Scraping failed: ${(error as Error).message}`);
      // Return fallback estimated data
      offers.push({
        title: 'Smiles - Compra de milhas',
        description: 'Dados estimados - scraping indisponivel temporariamente.',
        miles: 10_000,
        priceBrl: 260,
        url: 'https://www.smiles.com.br/comprar-milhas',
        type: 'PURCHASE',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        metadata: { estimated: true, reason: 'scraping_failed' },
      });
    }

    return offers;
  }
}
