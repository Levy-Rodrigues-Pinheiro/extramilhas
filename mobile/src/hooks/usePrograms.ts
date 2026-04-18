import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Program, PriceHistory, PriceHistoryRange, SimulatorParams, SimulatorResult, CpmPrediction } from '../types';
import { useMutation } from '@tanstack/react-query';

const PROGRAMS_KEY = 'programs';

const fetchPrograms = async (): Promise<Program[]> => {
  const { data } = await api.get('/programs');
  // Normalize: backend returns avgCpmCurrent, frontend expects currentCpm
  const raw = (Array.isArray(data) ? data : (data as any)?.data ?? data) as any[];
  return raw.map((p: any) => ({
    ...p,
    currentCpm: p.currentCpm ?? p.avgCpmCurrent ?? 0,
    averageCpm30d: p.averageCpm30d ?? p.avgCpmCurrent ?? 0,
    color: p.color ?? '',
  })) as Program[];
};

const fetchPriceHistory = async (
  programId: string,
  range: PriceHistoryRange,
): Promise<PriceHistory> => {
  const { data } = await api.get<PriceHistory>(
    `/programs/${programId}/price-history`,
    { params: { range } },
  );
  return data;
};

export function usePrograms() {
  return useQuery({
    queryKey: [PROGRAMS_KEY],
    queryFn: fetchPrograms,
    staleTime: 1000 * 60 * 10,
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: [PROGRAMS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Program>(`/programs/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function usePriceHistory(programId: string, range: PriceHistoryRange) {
  return useQuery({
    queryKey: [PROGRAMS_KEY, programId, 'price-history', range],
    queryFn: () => fetchPriceHistory(programId, range),
    enabled: !!programId,
    staleTime: 1000 * 60 * 15,
  });
}

export function useSimulator() {
  return useMutation({
    mutationFn: async (params: SimulatorParams): Promise<SimulatorResult[]> => {
      const classMap: Record<string, string> = {
        ECONOMY: 'economy',
        BUSINESS: 'business',
        FIRST: 'first',
      };
      const stopsMap: Record<string, number | undefined> = {
        DIRECT: 0,
        ONE_STOP: 1,
        ANY: undefined,
      };
      const flightClass = classMap[params.cabinClass] ?? 'economy';

      // Only airline programs have award charts
      const airlineSlugs = ['smiles', 'tudoazul', 'latampass'];
      const slugsToQuery = params.programIds?.length
        ? params.programIds.filter(s => airlineSlugs.includes(s))
        : airlineSlugs;

      // If no airline programs selected, use all airlines
      const finalSlugs = slugsToQuery.length > 0 ? slugsToQuery : airlineSlugs;

      // Query all selected airline programs in parallel
      const allResults = await Promise.all(
        finalSlugs.map(async (slug) => {
          try {
            const body: any = {
              milesQty: params.miles,
              programSlug: slug,
              class: flightClass,
              maxStops: stopsMap[params.maxStops],
            };
            if (params.origin) body.origin = params.origin;
            const { data } = await api.post('/simulator/destinations', body);
            const raw = Array.isArray(data) ? data : (data as any)?.data ?? data;
            return (raw as any[]).map((r: any) => ({
              destination: r.name ?? r.destination,
              destinationCode: r.iataCode ?? r.destinationCode,
              country: r.country,
              milesRequired: r.milesRequired,
              programId: slug,
              programName: r.programName ?? slug.charAt(0).toUpperCase() + slug.slice(1),
              isGoodOption: r.isGoodOption ?? (params.miles >= r.milesRequired),
              emissionUrl: r.emissionUrl,
            }));
          } catch {
            return [];
          }
        }),
      );

      // Flatten, deduplicate by destination (keep cheapest), sort by miles
      const flat = allResults.flat();
      const byDest = new Map<string, SimulatorResult>();
      for (const r of flat) {
        const key = r.destinationCode;
        const existing = byDest.get(key);
        if (!existing || r.milesRequired < existing.milesRequired) {
          byDest.set(key, r);
        }
      }
      return Array.from(byDest.values()).sort((a, b) => a.milesRequired - b.milesRequired);
    },
  });
}

export function usePrediction(programId: string) {
  return useQuery({
    queryKey: ['prediction', programId],
    queryFn: async () => { const { data } = await api.get(`/programs/${programId}/prediction`); return data as CpmPrediction; },
    enabled: !!programId,
    staleTime: 1000 * 60 * 30,
  });
}
