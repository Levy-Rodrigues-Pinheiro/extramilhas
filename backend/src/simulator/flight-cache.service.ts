import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperFlightResult } from './scraper-client.service';

export interface CachedFlight {
  programSlug: string;
  origin: string;
  destination: string;
  departDate: string;
  cabinClass: string;
  milesRequired: number;
  taxBrl: number;
  airline: string | null;
  flightNumber: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  duration: string | null;
  stops: number;
  fetchedAt: Date;
  isStale: boolean; // true quando passou do TTL mas ainda serve como fallback
}

/**
 * Cache persistente de resultados do scraper.
 *
 * Por que persistir no DB em vez de só memória?
 *
 * Akamai (usado pela Smiles) invalida cookies em 2-3 requests. Scraper falha
 * com frequência. Um sucesso precisa servir muitos usuários por muito tempo.
 *
 * Estratégia:
 * - TTL padrão 24h para dados frescos
 * - Retornar dados "stale" (até 7 dias) quando scraper falha, marcados como tal
 * - Limpeza periódica de entradas expiradas
 */
@Injectable()
export class FlightCacheService {
  private readonly logger = new Logger(FlightCacheService.name);
  private readonly freshTtlMs: number;
  private readonly staleTtlMs: number;

  constructor(private prisma: PrismaService) {
    // Padrão: 24h fresh, 7d stale
    const freshHours = parseInt(process.env.FLIGHT_CACHE_FRESH_HOURS || '24', 10);
    const staleHours = parseInt(process.env.FLIGHT_CACHE_STALE_HOURS || '168', 10);
    this.freshTtlMs = freshHours * 60 * 60 * 1000;
    this.staleTtlMs = staleHours * 60 * 60 * 1000;
    this.logger.log(
      `Cache configured: fresh=${freshHours}h, stale-fallback=${staleHours}h`,
    );
  }

  /**
   * Busca entradas frescas. Se não tiver nada fresco e `includeStale`, retorna dados antigos marcados.
   */
  async find(
    origin: string,
    destination: string,
    departDate: string,
    cabinClass: string,
    programSlug?: string,
    includeStale = true,
  ): Promise<CachedFlight[]> {
    const now = new Date();
    const staleLimit = new Date(now.getTime() - this.staleTtlMs);

    const where: any = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departDate,
      cabinClass: cabinClass.toLowerCase(),
      fetchedAt: { gte: staleLimit },
    };
    if (programSlug && programSlug !== 'all') {
      where.programSlug = programSlug;
    }

    const rows = await this.prisma.liveFlightCache.findMany({
      where,
      orderBy: [{ programSlug: 'asc' }, { milesRequired: 'asc' }],
    });

    const mapped: CachedFlight[] = rows.map((r) => {
      const isStale = r.expiresAt.getTime() < now.getTime();
      return {
        programSlug: r.programSlug,
        origin: r.origin,
        destination: r.destination,
        departDate: r.departDate,
        cabinClass: r.cabinClass,
        milesRequired: r.milesRequired,
        taxBrl: r.taxBrl,
        airline: r.airline,
        flightNumber: r.flightNumber,
        departureTime: r.departureTime,
        arrivalTime: r.arrivalTime,
        duration: r.duration,
        stops: r.stops,
        fetchedAt: r.fetchedAt,
        isStale,
      };
    });

    if (!includeStale) {
      return mapped.filter((r) => !r.isStale);
    }
    return mapped;
  }

  /**
   * Verifica se existe pelo menos uma entrada fresca (não-stale) para a consulta.
   * Usado pelo orquestrador para decidir se dispara scraper ou não.
   */
  async hasFresh(
    origin: string,
    destination: string,
    departDate: string,
    cabinClass: string,
  ): Promise<boolean> {
    const now = new Date();
    const count = await this.prisma.liveFlightCache.count({
      where: {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departDate,
        cabinClass: cabinClass.toLowerCase(),
        expiresAt: { gt: now },
      },
    });
    return count > 0;
  }

  /**
   * Persiste resultados do scraper. Upsert por (programSlug, origin, destination, date, cabin, flightNumber).
   */
  async upsertMany(results: ScraperFlightResult[]): Promise<number> {
    if (results.length === 0) return 0;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.freshTtlMs);

    let saved = 0;
    for (const r of results) {
      try {
        // Usar flightNumber como parte da chave; se vazio, usar hash (stops+times) para diferenciar
        const flightKey = r.flightNumber || `${r.stops}-${r.departureTime || 'x'}-${r.arrivalTime || 'x'}`;

        await this.prisma.liveFlightCache.upsert({
          where: {
            programSlug_origin_destination_departDate_cabinClass_flightNumber: {
              programSlug: r.programSlug,
              origin: r.origin.toUpperCase(),
              destination: r.destination.toUpperCase(),
              departDate: r.date,
              cabinClass: r.cabinClass.toLowerCase(),
              flightNumber: flightKey,
            },
          },
          create: {
            programSlug: r.programSlug,
            origin: r.origin.toUpperCase(),
            destination: r.destination.toUpperCase(),
            departDate: r.date,
            cabinClass: r.cabinClass.toLowerCase(),
            milesRequired: r.milesRequired,
            taxBrl: r.taxBrl || 0,
            airline: r.airline || null,
            flightNumber: flightKey,
            departureTime: r.departureTime || null,
            arrivalTime: r.arrivalTime || null,
            duration: r.duration || null,
            stops: r.stops ?? 0,
            rawPayload: JSON.stringify(r),
            fetchedAt: now,
            expiresAt,
          },
          update: {
            milesRequired: r.milesRequired,
            taxBrl: r.taxBrl || 0,
            airline: r.airline || null,
            departureTime: r.departureTime || null,
            arrivalTime: r.arrivalTime || null,
            duration: r.duration || null,
            stops: r.stops ?? 0,
            rawPayload: JSON.stringify(r),
            fetchedAt: now,
            expiresAt,
          },
        });
        saved++;
      } catch (err: any) {
        this.logger.warn(`Failed to cache flight: ${err.message}`);
      }
    }

    this.logger.log(`Cached ${saved}/${results.length} flight results`);
    return saved;
  }

  /**
   * Limpeza de entradas muito antigas (>staleTtl). Chamar em cron.
   */
  async cleanupStale(): Promise<number> {
    const cutoff = new Date(Date.now() - this.staleTtlMs);
    const result = await this.prisma.liveFlightCache.deleteMany({
      where: { fetchedAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} stale cache entries`);
    }
    return result.count;
  }

  /**
   * Estatísticas para admin panel.
   */
  async stats(): Promise<{
    total: number;
    fresh: number;
    stale: number;
    byProgram: Record<string, number>;
    recent: Array<{
      programSlug: string;
      origin: string;
      destination: string;
      departDate: string;
      milesRequired: number;
      airline: string | null;
      fetchedAt: Date;
      ageMinutes: number;
    }>;
    uniqueRoutes: number;
  }> {
    const now = new Date();
    const [total, fresh, byProgramRaw, recentRows, uniqueRoutesRows] = await Promise.all([
      this.prisma.liveFlightCache.count(),
      this.prisma.liveFlightCache.count({ where: { expiresAt: { gt: now } } }),
      this.prisma.liveFlightCache.groupBy({
        by: ['programSlug'],
        _count: { _all: true },
      }),
      this.prisma.liveFlightCache.findMany({
        orderBy: { fetchedAt: 'desc' },
        take: 20,
        select: {
          programSlug: true,
          origin: true,
          destination: true,
          departDate: true,
          milesRequired: true,
          airline: true,
          fetchedAt: true,
        },
      }),
      this.prisma.liveFlightCache.groupBy({
        by: ['origin', 'destination'],
      }),
    ]);

    const byProgram: Record<string, number> = {};
    for (const row of byProgramRaw) {
      byProgram[row.programSlug] = row._count._all;
    }

    const recent = recentRows.map((r) => ({
      ...r,
      ageMinutes: Math.round((now.getTime() - r.fetchedAt.getTime()) / 60000),
    }));

    return {
      total,
      fresh,
      stale: total - fresh,
      byProgram,
      recent,
      uniqueRoutes: uniqueRoutesRows.length,
    };
  }
}
