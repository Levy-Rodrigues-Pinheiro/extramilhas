import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleFlightsService } from './google-flights.service';
import { ScraperClientService, ScraperFlightResult } from './scraper-client.service';
import { FlightCacheService, CachedFlight } from './flight-cache.service';
import { getIataInfo } from './iata-data';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  cabinClass: string;
  passengers?: number;
  programSlug?: string;
  /** Quando true, pula cache e força novo scraping (admin only). */
  forceLive?: boolean;
}

export interface FlightSearchResult {
  programName: string;
  programSlug: string;
  origin: string;
  destination: string;
  destinationName: string;
  country: string;
  cabinClass: string;
  passengers: number;
  milesOneWay: number;
  milesRoundTrip: number;
  milesTotal: number;
  isRoundTrip: boolean;
  estimatedCashBrl: number;
  estimatedTicketBrl: number;
  savings: number;
  savingsPercent: number;
  recommendation: 'MILHAS' | 'DINHEIRO' | 'EQUIVALENTE';
  realCashPrice?: number;
  priceSource: 'reference' | 'estimated' | 'kiwi' | 'amadeus';
  airline?: string;
  flightDuration?: string;
  taxBrl?: number;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  seatsAvailable?: number;
  isLive: boolean;
  isDirectFlight: boolean;
  bookingUrl: string;
  source: string;
  disclaimer: string;
  lastUpdatedAt: string;
  officialUrl: string;
  dataQuality: 'REFERENCIA' | 'ATUALIZADO' | 'AO_VIVO';
}

const BOOKING_URLS: Record<string, string> = {
  smiles: 'https://www.smiles.com.br/passagens-aereas',
  tudoazul: 'https://www.tudoazul.com.br/resgatar-pontos',
  latampass: 'https://www.latamairlines.com/br/pt/latam-pass',
};

const PROGRAM_NAMES: Record<string, string> = {
  smiles: 'Smiles',
  tudoazul: 'TudoAzul',
  latampass: 'Latam Pass',
};

/**
 * Orquestrador de busca de voos por milhas.
 *
 * Arquitetura híbrida em 4 camadas (prioridade decrescente):
 *
 *   1. Cache fresco (DB, <24h)           → dataQuality=AO_VIVO
 *   2. Scraper live (Playwright :3002)   → dataQuality=AO_VIVO (e salva no cache)
 *   3. Cache stale (DB, 24h-7d)          → dataQuality=ATUALIZADO
 *   4. AwardChart (estático, ~200 rotas) → dataQuality=REFERENCIA
 *
 * Objetivo: cobertura total de rotas. Qualquer par IATA retorna algo, com o
 * máximo de frescor disponível e fallback gracioso quando anti-bot bloqueia.
 */
@Injectable()
export class FlightSearchService {
  private readonly logger = new Logger(FlightSearchService.name);
  private readonly scraperWaitMs: number;

  constructor(
    private prisma: PrismaService,
    private googleFlightsService: GoogleFlightsService,
    private scraper: ScraperClientService,
    private cache: FlightCacheService,
  ) {
    this.scraperWaitMs = parseInt(process.env.SCRAPER_WAIT_MS || '15000', 10);
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResult[]> {
    const { origin, destination, departDate, returnDate, cabinClass, programSlug, forceLive } = params;
    const passengers = Math.max(1, Math.min(9, params.passengers || 1));
    const isRoundTrip = !!returnDate;
    const originUp = origin.toUpperCase();
    const destUp = destination.toUpperCase();
    const cabinLc = (cabinClass || 'economy').toLowerCase();

    // --- 1. Referência de preço em R$ (para calcular savings) ---------------
    let refCashPrice: number | null = null;
    let refAirline: string | undefined;
    let refDuration: string | undefined;
    let priceSource: 'reference' | 'estimated' = 'estimated';

    try {
      const gfPrices = await this.googleFlightsService.searchPrices({
        origin: originUp,
        destination: destUp,
        departDate,
        returnDate,
        cabinClass: cabinLc,
      });
      if (gfPrices.length > 0) {
        refCashPrice = gfPrices[0].priceBrl;
        refAirline = gfPrices[0].airline;
        refDuration = gfPrices[0].duration;
        priceSource = 'reference';
      }
    } catch {
      /* silencioso */
    }
    const cashPrice = refCashPrice ?? this.estimateTicketPrice(originUp, destUp, cabinLc, isRoundTrip);

    // --- 2. Decidir se chama scraper ---------------------------------------
    // Evitar chamar scraper se já temos cache fresco (a menos que forceLive=true)
    let liveResults: ScraperFlightResult[] = [];
    let usedCacheFresh = false;

    if (!forceLive) {
      const hasFresh = await this.cache.hasFresh(originUp, destUp, departDate, cabinLc);
      if (hasFresh) {
        usedCacheFresh = true;
        this.logger.log(`Fresh cache hit for ${originUp}-${destUp} ${departDate} ${cabinLc}`);
      }
    }

    if (!usedCacheFresh) {
      // Dispara scraper com timeout. Em paralelo, nada espera — é fire-and-capture.
      liveResults = await this.scraper.searchFlights(
        { origin: originUp, destination: destUp, date: departDate, cabinClass: cabinLc },
        this.scraperWaitMs,
      );

      // Persiste no cache (não bloqueia o restante em caso de erro)
      if (liveResults.length > 0) {
        this.cache.upsertMany(liveResults).catch((err) => {
          this.logger.warn(`Cache upsert failed: ${err.message}`);
        });
      }
    }

    // --- 3. Carregar do cache (fresco OU stale como fallback) --------------
    const cachedFlights = await this.cache.find(
      originUp,
      destUp,
      departDate,
      cabinLc,
      programSlug,
      true, // includeStale
    );

    // --- 4. Buscar AwardChart estático (fallback final) --------------------
    const chartWhere: any = {
      origin: originUp,
      destination: destUp,
      cabinClass: cabinLc,
      isActive: true,
    };
    if (programSlug && programSlug !== 'all') {
      const program = await this.prisma.loyaltyProgram.findUnique({ where: { slug: programSlug } });
      if (program) chartWhere.programId = program.id;
    }
    const charts = await this.prisma.awardChart.findMany({
      where: chartWhere,
      include: {
        program: { select: { id: true, name: true, slug: true, avgCpmCurrent: true } },
      },
      orderBy: { milesRequired: 'asc' },
    });

    // --- 5. Mesclar: live > cache fresh > cache stale > chart -------------
    // Estratégia: por programa, prefira a fonte mais fresca disponível.
    const programsPresent = new Set<string>();

    // Mapa de CPM por programa (da DB) para calcular estimatedCashBrl
    const programCpm = new Map<string, number>();
    const programsFromDb = await this.prisma.loyaltyProgram.findMany({
      where: { slug: { in: ['smiles', 'tudoazul', 'latampass'] } },
      select: { slug: true, avgCpmCurrent: true, name: true, id: true },
    });
    for (const p of programsFromDb) programCpm.set(p.slug, Number(p.avgCpmCurrent));

    const results: FlightSearchResult[] = [];

    // 5a. Live (se houve sucesso nesta request)
    for (const live of liveResults) {
      if (programSlug && programSlug !== 'all' && live.programSlug !== programSlug) continue;
      if (programsPresent.has(live.programSlug)) continue;
      programsPresent.add(live.programSlug);
      results.push(
        this.buildResultFromLive(
          live,
          passengers,
          isRoundTrip,
          cashPrice,
          refCashPrice,
          refAirline,
          refDuration,
          priceSource,
          charts,
        ),
      );
    }

    // 5b. Cache (fresh ou stale, o que houver)
    for (const cached of cachedFlights) {
      if (programsPresent.has(cached.programSlug)) continue;
      programsPresent.add(cached.programSlug);
      results.push(
        this.buildResultFromCache(
          cached,
          passengers,
          isRoundTrip,
          cashPrice,
          refCashPrice,
          refAirline,
          refDuration,
          priceSource,
          programCpm.get(cached.programSlug) || 25,
        ),
      );
    }

    // 5c. AwardChart (fallback estático)
    for (const chart of charts) {
      if (programsPresent.has(chart.program.slug)) continue;
      programsPresent.add(chart.program.slug);
      results.push(
        this.buildResultFromChart(
          chart,
          passengers,
          isRoundTrip,
          cashPrice,
          refCashPrice,
          refAirline,
          refDuration,
          priceSource,
          departDate,
          returnDate,
        ),
      );
    }

    // 5d. Síntese por região (ÚLTIMO fallback — garante cobertura total)
    //     Quando nenhuma fonte tem dados para o par IATA, gera estimativa
    //     baseada na região geográfica. Sem isso, rotas exóticas retornam [].
    const allProgramSlugs = ['smiles', 'tudoazul', 'latampass'];
    const missingPrograms = allProgramSlugs.filter(
      (slug) => !programsPresent.has(slug) && (!programSlug || programSlug === 'all' || programSlug === slug),
    );
    for (const slug of missingPrograms) {
      const prog = programsFromDb.find((p) => p.slug === slug);
      if (!prog) continue;
      results.push(
        this.buildSyntheticResult(
          slug,
          prog.name,
          originUp,
          destUp,
          cabinLc,
          passengers,
          isRoundTrip,
          cashPrice,
          refCashPrice,
          refAirline,
          refDuration,
          departDate,
          returnDate,
          priceSource,
          Number(prog.avgCpmCurrent),
        ),
      );
    }

    const sorted = results.sort((a, b) => a.milesTotal - b.milesTotal);

    // Telemetria fire-and-forget — não bloqueia resposta. Usa catch para não
    // derrubar a busca se SearchLog falhar.
    this.logSearch({
      origin: originUp,
      destination: destUp,
      departDate,
      cabinClass: cabinLc,
      passengers,
      resultCount: sorted.length,
      topSource: sorted[0]?.source,
      isLive: sorted.some((r) => r.isLive),
    }).catch((err) => this.logger.warn(`SearchLog failed: ${err.message}`));

    return sorted;
  }

  /** Registra uma busca para telemetria (tier classification futuro). */
  private async logSearch(data: {
    origin: string;
    destination: string;
    departDate: string;
    cabinClass: string;
    passengers: number;
    resultCount: number;
    topSource?: string;
    isLive: boolean;
  }): Promise<void> {
    await this.prisma.searchLog.create({
      data: {
        origin: data.origin,
        destination: data.destination,
        departDate: data.departDate,
        cabinClass: data.cabinClass,
        passengers: data.passengers,
        resultCount: data.resultCount,
        topSource: data.topSource ?? null,
        isLive: data.isLive,
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Construtores de resultado por fonte
  // ───────────────────────────────────────────────────────────────────────────

  private buildResultFromLive(
    live: ScraperFlightResult,
    passengers: number,
    isRoundTrip: boolean,
    cashPrice: number,
    refCashPrice: number | null,
    refAirline: string | undefined,
    refDuration: string | undefined,
    priceSource: 'reference' | 'estimated',
    charts: any[],
  ): FlightSearchResult {
    // Enriquecimento: se o program tem chart, herdar nome/país. Caso contrário, IATA_DATA.
    const chart = charts.find((c) => c.program.slug === live.programSlug);
    const destInfo = chart
      ? { city: chart.destinationName, country: chart.country }
      : { city: getIataInfo(live.destination).city, country: getIataInfo(live.destination).country };

    const cpm = chart ? Number(chart.program.avgCpmCurrent) : 25;
    const milesOneWay = live.milesRequired * passengers;
    const milesRoundTrip = live.milesRequired * 2 * passengers;
    const milesTotal = isRoundTrip ? milesRoundTrip : milesOneWay;
    const estimatedCashBrl = parseFloat(((milesTotal / 1000) * cpm).toFixed(2));
    const totalCashPrice = cashPrice * passengers;
    const savings = totalCashPrice - estimatedCashBrl;
    const savingsPercent = totalCashPrice > 0 ? parseFloat(((savings / totalCashPrice) * 100).toFixed(1)) : 0;

    return {
      programName: PROGRAM_NAMES[live.programSlug] || live.programName,
      programSlug: live.programSlug,
      origin: live.origin,
      destination: live.destination,
      destinationName: destInfo.city,
      country: destInfo.country,
      cabinClass: live.cabinClass,
      passengers,
      milesOneWay,
      milesRoundTrip,
      milesTotal,
      isRoundTrip,
      estimatedCashBrl,
      estimatedTicketBrl: totalCashPrice,
      realCashPrice: refCashPrice ?? undefined,
      priceSource,
      airline: live.airline || refAirline,
      flightDuration: live.duration || refDuration,
      taxBrl: live.taxBrl,
      flightNumber: live.flightNumber,
      departureTime: live.departureTime,
      arrivalTime: live.arrivalTime,
      isLive: true,
      savings: parseFloat(Math.abs(savings).toFixed(2)),
      savingsPercent: Math.abs(savingsPercent),
      recommendation: this.classify(savingsPercent),
      isDirectFlight: (live.stops ?? 0) === 0,
      bookingUrl: BOOKING_URLS[live.programSlug] || '',
      source: 'live_scraping',
      disclaimer: 'Dados capturados em tempo real do site oficial. Confirme antes de emitir.',
      lastUpdatedAt: live.scrapedAt,
      officialUrl: this.buildOfficialUrl(
        live.programSlug,
        live.origin,
        live.destination,
        live.date,
        live.cabinClass,
        passengers,
      ),
      dataQuality: 'AO_VIVO',
    };
  }

  private buildResultFromCache(
    cached: CachedFlight,
    passengers: number,
    isRoundTrip: boolean,
    cashPrice: number,
    refCashPrice: number | null,
    refAirline: string | undefined,
    refDuration: string | undefined,
    priceSource: 'reference' | 'estimated',
    cpm: number,
  ): FlightSearchResult {
    const destInfo = getIataInfo(cached.destination);
    const milesOneWay = cached.milesRequired * passengers;
    const milesRoundTrip = cached.milesRequired * 2 * passengers;
    const milesTotal = isRoundTrip ? milesRoundTrip : milesOneWay;
    const estimatedCashBrl = parseFloat(((milesTotal / 1000) * cpm).toFixed(2));
    const totalCashPrice = cashPrice * passengers;
    const savings = totalCashPrice - estimatedCashBrl;
    const savingsPercent = totalCashPrice > 0 ? parseFloat(((savings / totalCashPrice) * 100).toFixed(1)) : 0;

    const staleHours = Math.round((Date.now() - cached.fetchedAt.getTime()) / (60 * 60 * 1000));

    return {
      programName: PROGRAM_NAMES[cached.programSlug] || cached.programSlug,
      programSlug: cached.programSlug,
      origin: cached.origin,
      destination: cached.destination,
      destinationName: destInfo.city,
      country: destInfo.country,
      cabinClass: cached.cabinClass,
      passengers,
      milesOneWay,
      milesRoundTrip,
      milesTotal,
      isRoundTrip,
      estimatedCashBrl,
      estimatedTicketBrl: totalCashPrice,
      realCashPrice: refCashPrice ?? undefined,
      priceSource,
      airline: cached.airline || refAirline,
      flightDuration: cached.duration || refDuration,
      taxBrl: cached.taxBrl,
      flightNumber: cached.flightNumber || undefined,
      departureTime: cached.departureTime || undefined,
      arrivalTime: cached.arrivalTime || undefined,
      isLive: !cached.isStale,
      savings: parseFloat(Math.abs(savings).toFixed(2)),
      savingsPercent: Math.abs(savingsPercent),
      recommendation: this.classify(savingsPercent),
      isDirectFlight: cached.stops === 0,
      bookingUrl: BOOKING_URLS[cached.programSlug] || '',
      source: cached.isStale ? 'cache_stale' : 'cache_fresh',
      disclaimer: cached.isStale
        ? `Dados capturados há ${staleHours}h — scraping atual falhou, mostrando última captura válida.`
        : `Dados capturados há ${staleHours}h do site oficial.`,
      lastUpdatedAt: cached.fetchedAt.toISOString(),
      officialUrl: this.buildOfficialUrl(
        cached.programSlug,
        cached.origin,
        cached.destination,
        cached.departDate,
        cached.cabinClass,
        passengers,
      ),
      dataQuality: cached.isStale ? 'ATUALIZADO' : 'AO_VIVO',
    };
  }

  /**
   * Última camada de fallback: sintetiza um resultado quando NADA tem dados
   * para o par IATA. Usa milhas aproximadas por região + classe + programa.
   * Tabelas calibradas com valores típicos observados nos 3 programas (2025-2026).
   */
  private buildSyntheticResult(
    programSlug: string,
    programName: string,
    origin: string,
    destination: string,
    cabinClass: string,
    passengers: number,
    isRoundTrip: boolean,
    cashPrice: number,
    refCashPrice: number | null,
    refAirline: string | undefined,
    refDuration: string | undefined,
    departDate: string,
    returnDate: string | undefined,
    priceSource: 'reference' | 'estimated',
    cpm: number,
  ): FlightSearchResult {
    // Milhas aproximadas one-way por região (economy) — calibrado 2025-2026
    const REGION_MILES: Record<string, Record<string, number>> = {
      smiles: {
        domestic: 8000, south_america: 18000, central_america: 35000,
        north_america: 55000, europe: 75000, middle_east: 95000,
        asia: 110000, oceania: 120000, africa: 100000,
      },
      tudoazul: {
        domestic: 7000, south_america: 17000, central_america: 33000,
        north_america: 52000, europe: 72000, middle_east: 90000,
        asia: 105000, oceania: 115000, africa: 95000,
      },
      latampass: {
        domestic: 9000, south_america: 20000, central_america: 38000,
        north_america: 60000, europe: 80000, middle_east: 100000,
        asia: 115000, oceania: 125000, africa: 105000,
      },
    };

    const CLASS_MULTIPLIER: Record<string, number> = { economy: 1, business: 2.5, first: 4 };

    const originInfo = getIataInfo(origin);
    const destInfo = getIataInfo(destination);
    // Se origem e destino no Brasil → domestic; senão, região do destino.
    const region =
      originInfo.region === 'domestic' && destInfo.region === 'domestic'
        ? 'domestic'
        : destInfo.region;
    const baseMiles = REGION_MILES[programSlug]?.[region] || 60000;
    const classMult = CLASS_MULTIPLIER[cabinClass.toLowerCase()] || 1;
    const milesRequired = Math.round(baseMiles * classMult);

    const milesOneWay = milesRequired * passengers;
    const milesRoundTrip = milesRequired * 2 * passengers;
    const milesTotal = isRoundTrip ? milesRoundTrip : milesOneWay;
    const estimatedCashBrl = parseFloat(((milesTotal / 1000) * cpm).toFixed(2));
    const totalCashPrice = cashPrice * passengers;
    const savings = totalCashPrice - estimatedCashBrl;
    const savingsPercent = totalCashPrice > 0 ? parseFloat(((savings / totalCashPrice) * 100).toFixed(1)) : 0;

    return {
      programName,
      programSlug,
      origin,
      destination,
      destinationName: destInfo.city,
      country: destInfo.country,
      cabinClass,
      passengers,
      milesOneWay,
      milesRoundTrip,
      milesTotal,
      isRoundTrip,
      estimatedCashBrl,
      estimatedTicketBrl: totalCashPrice,
      realCashPrice: refCashPrice ?? undefined,
      priceSource,
      airline: refAirline,
      flightDuration: refDuration,
      isLive: false,
      savings: parseFloat(Math.abs(savings).toFixed(2)),
      savingsPercent: Math.abs(savingsPercent),
      recommendation: this.classify(savingsPercent),
      isDirectFlight: false, // pessimista — rotas sintéticas geralmente têm conexão
      bookingUrl: BOOKING_URLS[programSlug] || '',
      source: 'synthetic_estimate',
      disclaimer:
        'ESTIMATIVA baseada em região geográfica. Rota não está na nossa base local e scraping ao vivo não disponível agora. Confirme no site oficial.',
      lastUpdatedAt: new Date().toISOString(),
      officialUrl: this.buildOfficialUrl(programSlug, origin, destination, departDate, cabinClass, passengers, returnDate),
      dataQuality: 'REFERENCIA',
    };
  }

  private buildResultFromChart(
    chart: any,
    passengers: number,
    isRoundTrip: boolean,
    cashPrice: number,
    refCashPrice: number | null,
    refAirline: string | undefined,
    refDuration: string | undefined,
    priceSource: 'reference' | 'estimated',
    departDate: string,
    returnDate: string | undefined,
  ): FlightSearchResult {
    const cpm = Number(chart.program.avgCpmCurrent);
    const milesOneWay = chart.milesRequired * passengers;
    const milesRoundTrip = chart.milesRequired * 2 * passengers;
    const milesTotal = isRoundTrip ? milesRoundTrip : milesOneWay;
    const estimatedCashBrl = parseFloat(((milesTotal / 1000) * cpm).toFixed(2));
    const totalCashPrice = cashPrice * passengers;
    const savings = totalCashPrice - estimatedCashBrl;
    const savingsPercent = totalCashPrice > 0 ? parseFloat(((savings / totalCashPrice) * 100).toFixed(1)) : 0;

    return {
      programName: chart.program.name,
      programSlug: chart.program.slug,
      origin: chart.origin,
      destination: chart.destination,
      destinationName: chart.destinationName,
      country: chart.country,
      cabinClass: chart.cabinClass,
      passengers,
      milesOneWay,
      milesRoundTrip,
      milesTotal,
      isRoundTrip,
      estimatedCashBrl,
      estimatedTicketBrl: totalCashPrice,
      realCashPrice: refCashPrice ?? undefined,
      priceSource,
      airline: refAirline,
      flightDuration: refDuration,
      isLive: false,
      savings: parseFloat(Math.abs(savings).toFixed(2)),
      savingsPercent: Math.abs(savingsPercent),
      recommendation: this.classify(savingsPercent),
      isDirectFlight: chart.isDirectFlight,
      bookingUrl: BOOKING_URLS[chart.program.slug] || '',
      source: chart.source,
      disclaimer: 'Preço base de referência. Confirme o valor exato no site oficial antes de emitir.',
      lastUpdatedAt: chart.updatedAt?.toISOString() || chart.createdAt?.toISOString() || new Date().toISOString(),
      officialUrl: this.buildOfficialUrl(
        chart.program.slug,
        chart.origin,
        chart.destination,
        departDate,
        chart.cabinClass,
        passengers,
        returnDate,
      ),
      dataQuality: 'REFERENCIA',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  private classify(savingsPercent: number): 'MILHAS' | 'DINHEIRO' | 'EQUIVALENTE' {
    if (savingsPercent > 10) return 'MILHAS';
    if (savingsPercent < -10) return 'DINHEIRO';
    return 'EQUIVALENTE';
  }

  private buildOfficialUrl(
    programSlug: string,
    origin: string,
    dest: string,
    date: string,
    cabin: string,
    passengers: number,
    returnDate?: string,
  ): string {
    const pax = Math.max(1, passengers || 1);
    const isRT = !!returnDate;
    const cabinLc = (cabin || 'economy').toLowerCase();
    const safeDate = date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    if (programSlug === 'smiles') {
      const cabinType = cabinLc === 'business' || cabinLc === 'first' ? 'BUSINESS' : 'ECONOMIC';
      const tripType = isRT ? 2 : 1;
      const params = new URLSearchParams({
        originAirportCode: origin,
        destinationAirportCode: dest,
        departureDate: safeDate,
        adults: String(pax),
        children: '0',
        infants: '0',
        cabinType,
        tripType: String(tripType),
        currencyCode: 'BRL',
        segments: '1',
      });
      if (returnDate) params.set('returnDate', returnDate);
      return `https://www.smiles.com.br/emissao?${params.toString()}`;
    }

    if (programSlug === 'tudoazul') {
      const dd1 = this.formatDateForProgram('tudoazul', safeDate);
      const cc = cabinLc === 'business' || cabinLc === 'first' ? 'business' : 'economy';
      const params = new URLSearchParams({
        o1: origin,
        d1: dest,
        dd1,
        'passengers.adults': String(pax),
        'passengers.children': '0',
        'passengers.infants': '0',
        r: isRT ? 'true' : 'false',
        cc,
        isAward: 'true',
      });
      if (returnDate) {
        params.set('o2', dest);
        params.set('d2', origin);
        params.set('dd2', this.formatDateForProgram('tudoazul', returnDate));
      }
      return `https://www.voeazul.com.br/br/pt/home/selecao-de-voos?${params.toString()}`;
    }

    if (programSlug === 'latampass') {
      const outbound = this.formatDateForProgram('latampass', safeDate);
      const cabinLatam = cabinLc === 'business' || cabinLc === 'first' ? 'Business' : 'Economy';
      const trip = isRT ? 'RT' : 'OW';
      const params = new URLSearchParams({
        origin,
        destination: dest,
        outbound,
        adt: String(pax),
        chd: '0',
        inf: '0',
        trip,
        cabin: cabinLatam,
        redemption: 'true',
        sort: 'RECOMMENDED',
      });
      if (returnDate) params.set('inbound', this.formatDateForProgram('latampass', returnDate));
      return `https://www.latamairlines.com/br/pt/oferta-voos?${params.toString()}`;
    }

    return `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${dest}+on+${safeDate}&hl=pt-BR&curr=BRL`;
  }

  private formatDateForProgram(programSlug: string, isoDate: string): string {
    if (programSlug === 'tudoazul') {
      const [y, m, d] = isoDate.split('-');
      if (!y || !m || !d) return isoDate;
      return `${d}-${m}-${y}`;
    }
    if (programSlug === 'latampass') {
      return `${isoDate}T12:00:00.000Z`;
    }
    return isoDate;
  }

  private estimateTicketPrice(origin: string, destination: string, cabinClass: string, isRoundTrip: boolean): number {
    const ROUTE_PRICES: Record<string, number> = {
      domestic: 400,
      south_america: 800,
      central_america: 1500,
      north_america: 2500,
      europe: 2800,
      middle_east: 3500,
      asia: 4500,
      oceania: 5000,
      africa: 5500,
    };

    const CLASS_MULTIPLIER: Record<string, number> = {
      economy: 1,
      business: 3,
      first: 5,
    };

    const destRegion = getIataInfo(destination).region;
    const originRegion = getIataInfo(origin).region;

    let region: string = destRegion;
    if (originRegion === destRegion && destRegion === 'domestic') {
      region = 'domestic';
    }

    const basePrice = ROUTE_PRICES[region] || 2000;
    const classMultiplier = CLASS_MULTIPLIER[cabinClass.toLowerCase()] || 1;
    const oneWayPrice = basePrice * classMultiplier;

    return parseFloat((isRoundTrip ? oneWayPrice * 1.8 : oneWayPrice).toFixed(2));
  }
}
