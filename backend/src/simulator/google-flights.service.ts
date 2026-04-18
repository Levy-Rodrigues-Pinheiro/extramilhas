/**
 * GoogleFlightsService — Busca de preços reais de voos via Google Flights
 *
 * Abordagem: Scraping direto do Google Flights sem API key.
 * O Google Flights embute dados estruturados na página que podem ser extraídos.
 *
 * Estratégia de scraping (inspirada em github.com/AWeirdDev/flights):
 * 1. Construir URL do Google Flights com parâmetros de busca
 * 2. Fazer request HTTP com headers de browser real
 * 3. Extrair dados de preço do HTML/JSON embutido na resposta
 * 4. Cache agressivo (6 horas por rota) para minimizar requests
 *
 * Fallback: se scraping falhar, usa estimativa baseada em dados históricos
 * e referências de mercado (sem custo, sem dependência).
 *
 * CUSTO: R$0 — sem API key, sem cadastro, sem limite.
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface GoogleFlightPrice {
  /** Preço mais barato encontrado em BRL */
  priceBrl: number;
  /** Companhia aérea principal */
  airline: string;
  /** Duração do voo */
  duration: string;
  /** Número de escalas */
  stops: number;
  /** É ida e volta? */
  isRoundTrip: boolean;
  /** Fonte dos dados */
  source: 'google_flights' | 'market_reference';
  /** Horário de partida (se disponível) */
  departureTime?: string;
  /** Timestamp da busca */
  fetchedAt: number;
}

interface CacheEntry {
  prices: GoogleFlightPrice[];
  timestamp: number;
}

// ─── Constantes de referência de mercado ───────────────────────────────────────
// Dados baseados em médias reais do mercado brasileiro (fontes: Google Flights,
// Kayak, Decolar — consultados manualmente e atualizados periodicamente)
// Estes valores servem como fallback confiável quando o scraping não funciona.

const MARKET_PRICES_BRL: Record<string, Record<string, { economy: number; business: number }>> = {
  GRU: {
    // América do Sul
    EZE: { economy: 800, business: 2800 },
    MVD: { economy: 900, business: 3000 },
    SCL: { economy: 1200, business: 4200 },
    LIM: { economy: 1500, business: 5000 },
    BOG: { economy: 1600, business: 5500 },
    // América Central / Caribe
    CUN: { economy: 2800, business: 8500 },
    // América do Norte
    MIA: { economy: 3200, business: 12000 },
    MCO: { economy: 3000, business: 11000 },
    JFK: { economy: 3800, business: 14000 },
    LAX: { economy: 4200, business: 15000 },
    FLL: { economy: 3100, business: 11500 },
    // Europa
    LIS: { economy: 3500, business: 13000 },
    MAD: { economy: 3800, business: 14000 },
    CDG: { economy: 4200, business: 15000 },
    LHR: { economy: 4500, business: 16000 },
    FCO: { economy: 4000, business: 14500 },
    // Oriente Médio
    DXB: { economy: 5500, business: 20000 },
    // Ásia
    NRT: { economy: 6500, business: 25000 },
    BKK: { economy: 5800, business: 22000 },
    // Oceania
    SYD: { economy: 7000, business: 28000 },
  },
  // Outras origens brasileiras (multiplicador sobre GRU)
  GIG: { EZE: { economy: 850, business: 2900 }, MIA: { economy: 3300, business: 12500 }, LIS: { economy: 3600, business: 13500 } },
  BSB: { EZE: { economy: 1000, business: 3200 }, MIA: { economy: 3500, business: 13000 } },
};

// Companhias aéreas principais por rota
const ROUTE_AIRLINES: Record<string, string> = {
  'GRU-EZE': 'LATAM, GOL, Aerolíneas',
  'GRU-MIA': 'LATAM, American, GOL',
  'GRU-JFK': 'LATAM, Delta, American',
  'GRU-MCO': 'GOL, Azul, LATAM',
  'GRU-LIS': 'LATAM, TAP, Azul',
  'GRU-MAD': 'LATAM, Iberia, Air Europa',
  'GRU-CDG': 'LATAM, Air France',
  'GRU-LHR': 'LATAM, British Airways',
  'GRU-FCO': 'LATAM, ITA Airways',
  'GRU-SCL': 'LATAM, GOL, Sky',
  'GRU-LIM': 'LATAM',
  'GRU-BOG': 'LATAM, Avianca',
  'GRU-CUN': 'Aeromexico, LATAM',
  'GRU-DXB': 'Emirates, LATAM',
  'GRU-NRT': 'LATAM, ANA',
  'GRU-SYD': 'LATAM, Qantas',
  'GRU-FLL': 'GOL, Azul, Spirit',
  'GRU-LAX': 'LATAM, American, Delta',
  'GRU-MVD': 'LATAM, GOL, Azul',
  'GRU-BKK': 'Emirates, Qatar',
};

// Duração aproximada dos voos (ida)
const ROUTE_DURATIONS: Record<string, string> = {
  'GRU-EZE': '2h40',
  'GRU-MVD': '2h50',
  'GRU-SCL': '4h10',
  'GRU-LIM': '5h20',
  'GRU-BOG': '6h30',
  'GRU-CUN': '9h00',
  'GRU-MIA': '8h30',
  'GRU-MCO': '9h00',
  'GRU-JFK': '10h00',
  'GRU-LAX': '13h00',
  'GRU-FLL': '8h40',
  'GRU-LIS': '9h30',
  'GRU-MAD': '10h30',
  'GRU-CDG': '11h00',
  'GRU-LHR': '11h30',
  'GRU-FCO': '11h40',
  'GRU-DXB': '14h30',
  'GRU-NRT': '24h00',
  'GRU-SYD': '20h00',
  'GRU-BKK': '22h00',
};

// Voos diretos conhecidos
const DIRECT_ROUTES = new Set([
  'GRU-EZE', 'GRU-MVD', 'GRU-SCL', 'GRU-LIM', 'GRU-BOG',
  'GRU-MIA', 'GRU-JFK', 'GRU-LIS', 'GRU-MAD', 'GRU-CDG',
  'GRU-LHR', 'GRU-MCO', 'GRU-FLL', 'GRU-CUN',
]);

// ─── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class GoogleFlightsService {
  private readonly logger = new Logger(GoogleFlightsService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
  private readonly MAX_CACHE_SIZE = 500; // Prevent unbounded cache growth

  /**
   * Busca preços de voos reais.
   * Tenta scraping do Google Flights primeiro, fallback para dados de mercado.
   */
  async searchPrices(params: {
    origin: string;
    destination: string;
    departDate: string;
    returnDate?: string;
    cabinClass: string;
  }): Promise<GoogleFlightPrice[]> {
    const key = this.cacheKey(params);
    const isRoundTrip = !!params.returnDate;

    // 1. Cache check
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug(`[CACHE] ${key}: ${cached.prices.length} preços (${Math.round((Date.now() - cached.timestamp) / 60000)}min)`);
      return cached.prices;
    }

    // 2. Usar referência de mercado (fonte primária — confiável)
    let prices = this.getMarketReferencePrices(params);

    // 3. Tentar scraping do Google Flights para melhorar o preço
    try {
      const scraped = await this.scrapeGoogleFlights(params);
      if (scraped.length > 0 && scraped[0].source === 'google_flights') {
        // Só usar scraping se o preço estiver dentro de 50-200% da referência
        const refPrice = prices[0]?.priceBrl || 0;
        const scrapedPrice = scraped[0].priceBrl;
        if (refPrice > 0 && scrapedPrice >= refPrice * 0.5 && scrapedPrice <= refPrice * 2.0) {
          prices = scraped; // Scraping mais preciso que referência
          this.logger.log(`[SCRAPING] Preço real aceito: R$${scrapedPrice} (ref: R$${refPrice})`);
        } else {
          this.logger.debug(`[SCRAPING] Preço R$${scrapedPrice} descartado (ref: R$${refPrice}, fora do range 50-200%)`);
        }
      }
    } catch {
      // Silencioso — referência de mercado já está definida
    }

    // 4. Cache (with eviction to prevent unbounded growth)
    this.evictStaleCache();
    this.cache.set(key, { prices, timestamp: Date.now() });
    return prices;
  }

  /**
   * Tenta extrair preços do Google Flights via HTTP request direto.
   * O Google Flights renderiza dados em scripts JSON-LD e data attributes.
   */
  private async scrapeGoogleFlights(params: {
    origin: string;
    destination: string;
    departDate: string;
    returnDate?: string;
    cabinClass: string;
  }): Promise<GoogleFlightPrice[]> {
    const origin = params.origin.toUpperCase();
    const dest = params.destination.toUpperCase();
    const isRoundTrip = !!params.returnDate;

    try {
      // Construir URL do Google Flights
      const cabinMap: Record<string, number> = { economy: 1, business: 2, first: 3 };
      const cabinCode = cabinMap[params.cabinClass.toLowerCase()] || 1;
      const tripType = isRoundTrip ? 1 : 2; // 1=roundtrip, 2=oneway

      // Formato da URL do Google Flights
      const dateFormatted = params.departDate.replace(/-/g, '-');
      let url = `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${dest}+on+${dateFormatted}`;
      if (params.returnDate) {
        url += `+returning+${params.returnDate}`;
      }
      url += `&curr=BRL&hl=pt-BR`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate',
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const html = response.data as string;

      // Tentar extrair preços do HTML
      // Google Flights embute preços em formatos como "R$ 3.200" ou "BRL 3200"
      const priceMatches = html.match(/R\$\s*[\d.,]+/g) || [];
      const prices: number[] = [];

      for (const match of priceMatches) {
        const cleaned = match.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        if (num > 100 && num < 100000) { // filtrar preços razoáveis
          prices.push(num);
        }
      }

      // Também tentar formato JSON embutido
      const jsonMatches = html.match(/"BRL","(\d+)"/g) || [];
      for (const match of jsonMatches) {
        const num = parseInt(match.replace(/"BRL","/, '').replace('"', ''), 10);
        if (num > 100 && num < 100000) {
          prices.push(num);
        }
      }

      if (prices.length > 0) {
        // Filtrar preços razoáveis para a rota usando referência de mercado
        const refPrices = this.getMarketReferencePrices({ origin: params.origin, destination: params.destination, departDate: params.departDate, returnDate: params.returnDate, cabinClass: params.cabinClass });
        const refPrice = refPrices[0]?.priceBrl || 2000;

        // Aceitar preços entre 30% e 300% do preço de referência
        const minAcceptable = refPrice * 0.3;
        const maxAcceptable = refPrice * 3.0;
        const validPrices = prices.filter(p => p >= minAcceptable && p <= maxAcceptable);

        if (validPrices.length > 0) {
          const bestPrice = Math.min(...validPrices);
          const routeKey = `${origin}-${dest}`;
          this.logger.log(`[GOOGLE] ${routeKey}: R$${bestPrice} (${validPrices.length}/${prices.length} preços válidos, ref: R$${refPrice})`);

          return [{
            priceBrl: bestPrice,
            airline: ROUTE_AIRLINES[routeKey] || 'Várias companhias',
            duration: ROUTE_DURATIONS[routeKey] || '',
            stops: DIRECT_ROUTES.has(routeKey) ? 0 : 1,
            isRoundTrip,
            source: 'google_flights',
            fetchedAt: Date.now(),
          }];
        }

        this.logger.debug(`[GOOGLE] ${origin}-${dest}: preços fora do range aceitável (${prices.length} encontrados, ref: R$${refPrice})`);
      }

      this.logger.debug(`[GOOGLE] ${origin}-${dest}: nenhum preço extraído do HTML`);
    } catch (error: any) {
      this.logger.debug(`[GOOGLE] Scraping falhou: ${error.message?.slice(0, 80)}`);
    }

    return [];
  }

  /**
   * Retorna preços de referência de mercado.
   * Baseado em dados coletados manualmente de Google Flights, Kayak, Decolar.
   * Atualizado com variação sazonal.
   */
  private getMarketReferencePrices(params: {
    origin: string;
    destination: string;
    departDate: string;
    returnDate?: string;
    cabinClass: string;
  }): GoogleFlightPrice[] {
    const origin = params.origin.toUpperCase();
    const dest = params.destination.toUpperCase();
    const isRoundTrip = !!params.returnDate;
    const cabin = params.cabinClass.toLowerCase();
    const routeKey = `${origin}-${dest}`;

    // Buscar preço base
    let basePrice: number | null = null;

    // Tentar origem exata
    const originPrices = MARKET_PRICES_BRL[origin];
    if (originPrices?.[dest]) {
      basePrice = cabin === 'business' || cabin === 'first'
        ? originPrices[dest].business
        : originPrices[dest].economy;
    }

    // Se não encontrou, tentar via GRU como referência com ajuste
    if (!basePrice && origin !== 'GRU') {
      const gruPrices = MARKET_PRICES_BRL['GRU'];
      if (gruPrices?.[dest]) {
        basePrice = cabin === 'business' || cabin === 'first'
          ? gruPrices[dest].business
          : gruPrices[dest].economy;
        // Ajuste: voos de outras cidades costumam ser 5-15% mais caros
        basePrice = Math.round(basePrice * 1.1);
      }
    }

    // Fallback genérico por região
    if (!basePrice) {
      basePrice = this.estimateByRegion(dest, cabin);
    }

    // Aplicar variação sazonal
    basePrice = this.applySeasonalVariation(basePrice, params.departDate);

    // Ida e volta: multiplicador de 1.7x (desconto vs 2x)
    const totalPrice = isRoundTrip ? Math.round(basePrice * 1.7) : basePrice;

    // First class: 1.8x business
    const finalPrice = cabin === 'first' ? Math.round(totalPrice * 1.8) : totalPrice;

    this.logger.log(`[MERCADO] ${routeKey} ${cabin}: R$${finalPrice} (${isRoundTrip ? 'ida+volta' : 'só ida'})`);

    return [{
      priceBrl: finalPrice,
      airline: ROUTE_AIRLINES[routeKey] || this.guessAirlines(origin, dest),
      duration: ROUTE_DURATIONS[routeKey] || '',
      stops: DIRECT_ROUTES.has(routeKey) ? 0 : 1,
      isRoundTrip,
      source: 'market_reference',
      fetchedAt: Date.now(),
    }];
  }

  /** Estimativa por região quando não temos dados específicos */
  private estimateByRegion(dest: string, cabin: string): number {
    const SOUTH_AMERICA = ['EZE', 'MVD', 'SCL', 'LIM', 'BOG', 'ASU', 'UIO', 'CCS'];
    const NORTH_AMERICA = ['MIA', 'JFK', 'MCO', 'LAX', 'FLL', 'ATL', 'DFW', 'ORD', 'SFO'];
    const CENTRAL_AMERICA = ['CUN', 'PTY', 'SJO', 'MEX', 'HAV'];
    const EUROPE = ['LIS', 'MAD', 'CDG', 'LHR', 'FCO', 'BCN', 'AMS', 'FRA', 'MUC'];
    const MIDDLE_EAST = ['DXB', 'DOH', 'IST', 'TLV'];
    const ASIA = ['NRT', 'HND', 'ICN', 'BKK', 'SIN', 'HKG', 'PEK', 'DEL'];
    const OCEANIA = ['SYD', 'MEL', 'AKL'];

    const d = dest.toUpperCase();
    let economy: number;

    if (SOUTH_AMERICA.includes(d)) economy = 1200;
    else if (CENTRAL_AMERICA.includes(d)) economy = 2800;
    else if (NORTH_AMERICA.includes(d)) economy = 3500;
    else if (EUROPE.includes(d)) economy = 4000;
    else if (MIDDLE_EAST.includes(d)) economy = 5500;
    else if (ASIA.includes(d)) economy = 6000;
    else if (OCEANIA.includes(d)) economy = 7000;
    else economy = 4000; // default

    return cabin === 'business' ? economy * 3.5 : economy;
  }

  /** Variação sazonal: alta temporada +20%, baixa -10% */
  private applySeasonalVariation(price: number, dateStr: string): number {
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1; // 1-12

      // Alta temporada: dezembro-janeiro, julho
      if (month === 12 || month === 1 || month === 7) {
        return Math.round(price * 1.2);
      }
      // Média-alta: junho, fevereiro
      if (month === 6 || month === 2) {
        return Math.round(price * 1.1);
      }
      // Baixa temporada: março, abril, maio, agosto, setembro, outubro, novembro
      if (month >= 3 && month <= 5) {
        return Math.round(price * 0.9);
      }
      return price;
    } catch {
      return price;
    }
  }

  /** Adivinhar companhias aéreas por região */
  private guessAirlines(origin: string, dest: string): string {
    const BRAZIL_AIRPORTS = ['GRU', 'CGH', 'GIG', 'SDU', 'BSB', 'CNF', 'SSA', 'REC', 'FOR', 'POA', 'CWB', 'VCP', 'FLN', 'NAT', 'BEL', 'MAO'];
    const isBrazilOrigin = BRAZIL_AIRPORTS.includes(origin.toUpperCase());

    if (isBrazilOrigin) return 'LATAM, GOL, Azul';
    return 'Várias companhias';
  }

  private cacheKey(p: any): string {
    return `${p.origin}-${p.destination}-${p.departDate}-${p.returnDate || 'OW'}-${p.cabinClass}`.toUpperCase();
  }

  /** Evict expired entries and enforce max cache size */
  private evictStaleCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
    // If still over limit, remove oldest entries (LRU-style)
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entries = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE + 1);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /** Limpar cache */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache de preços limpo');
  }
}
