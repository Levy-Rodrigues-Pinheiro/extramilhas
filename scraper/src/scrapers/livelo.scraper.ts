import { RawOffer } from '../types';
import { BaseScraper } from './base.scraper';

/**
 * Livelo scraper.
 * Livelo is Brazil's largest loyalty coalition program backed by Banco do Brasil
 * and Bradesco.
 *
 * Uses Playwright to scrape https://www.livelo.com.br for points purchase
 * offers and transfer bonuses. Falls back to estimated pricing when
 * live scraping fails.
 */
export class LiveloScraper extends BaseScraper {
  readonly programSlug = 'livelo';
  readonly programName = 'Livelo';
  readonly baseUrl = 'https://www.livelo.com.br';

  async scrapeOffers(): Promise<RawOffer[]> {
    this.logger.info('[Livelo] Starting scraping...');
    const offers: RawOffer[] = [];

    try {
      const browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'User-Agent': this.getRandomUserAgent() });

      // Scrape purchase page
      await page.goto('https://www.livelo.com.br/ganhe-pontos/compre-pontos', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await this.randomDelay();

      // Try to extract offer data from the page
      const priceData = await page.evaluate(() => {
        const results: Array<{ title: string; miles: number; price: number; url: string }> = [];

        const cards = document.querySelectorAll(
          '[class*="card"], [class*="offer"], [class*="OfferCard"], [class*="produto"], [class*="package"]',
        );
        cards.forEach((card) => {
          const titleEl = card.querySelector('h2, h3, h4, [class*="title"], [class*="titulo"], [class*="name"]');
          const priceEl = card.querySelector('[class*="price"], [class*="preco"], [class*="valor"], [class*="amount"]');
          const pointsEl = card.querySelector('[class*="points"], [class*="pontos"], [class*="quantity"]');

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
            title: item.title || 'Livelo - Compra de Pontos',
            description: `Compre ${item.miles.toLocaleString('pt-BR')} pontos Livelo por R$${item.price.toFixed(2)}`,
            miles: item.miles,
            priceBrl: item.price,
            url: item.url,
            type: 'PURCHASE',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
        this.logger.info(`[Livelo] Extracted ${offers.length} real offers`);
      } else {
        // Fallback: estimated CPM ~30 per 1000 points
        this.logger.warn('[Livelo] No offers extracted from DOM, using estimated data');
        offers.push({
          title: 'Livelo - Compra de pontos com bonus',
          description: 'Compre pontos Livelo. Preco estimado baseado em dados recentes.',
          miles: 10_000,
          priceBrl: 300,
          url: 'https://www.livelo.com.br/ganhe-pontos/compre-pontos',
          type: 'PURCHASE',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          metadata: { estimated: true },
        });
      }

      // Check for transfer promotions
      try {
        await page.goto('https://www.livelo.com.br/transfira-pontos', {
          waitUntil: 'domcontentloaded',
          timeout: 15_000,
        });
        await this.randomDelay();

        const transferText = await page.textContent('body');
        if (transferText && (transferText.includes('bonus') || transferText.includes('bônus'))) {
          const bonusMatch = transferText.match(/(\d+)%\s*(de\s*)?b[oô]nus/i);
          if (bonusMatch) {
            offers.push({
              title: `Livelo - Transferencia com ${bonusMatch[1]}% de bonus`,
              description: `Transfira pontos Livelo para parceiros com ${bonusMatch[1]}% de bonus.`,
              miles: 10_000,
              priceBrl: 250,
              url: 'https://www.livelo.com.br/transfira-pontos',
              type: 'TRANSFER_BONUS',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              metadata: { bonusPercent: parseInt(bonusMatch[1], 10) },
            });
          }
        }
      } catch {
        this.logger.warn('[Livelo] Transfer page scraping failed');
      }

      await browser.close();
    } catch (error) {
      this.logger.error(`[Livelo] Scraping failed: ${(error as Error).message}`);
      // Return fallback estimated data
      offers.push({
        title: 'Livelo - Compra de pontos',
        description: 'Dados estimados - scraping indisponivel temporariamente.',
        miles: 10_000,
        priceBrl: 300,
        url: 'https://www.livelo.com.br/ganhe-pontos/compre-pontos',
        type: 'PURCHASE',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        metadata: { estimated: true, reason: 'scraping_failed' },
      });
    }

    return offers;
  }
}
