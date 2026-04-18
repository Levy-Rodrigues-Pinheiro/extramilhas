import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import type { FlightSearchResult } from '../types';

export function useFlightSearch() {
  return useMutation({
    mutationFn: async (params: {
      origin: string;
      destination: string;
      departDate: string;
      returnDate?: string;
      cabinClass: string;
      passengers?: number;
      programSlug?: string;
    }): Promise<FlightSearchResult[]> => {
      const { data } = await api.post('/simulator/search-flights', params);
      const raw = Array.isArray(data) ? data : (data as any)?.data ?? data;
      return raw as FlightSearchResult[];
    },
  });
}
