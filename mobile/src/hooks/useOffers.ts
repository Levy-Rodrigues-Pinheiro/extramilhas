import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import api from '../lib/api';
import type { Offer, OffersResponse, OfferFilters } from '../types';

export const OFFERS_QUERY_KEY = 'offers';

const fetchOffers = async (filters: OfferFilters): Promise<OffersResponse> => {
  const params: Record<string, string | number> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
  };
  if (filters.search) params.search = filters.search;
  if (filters.maxCpm) params.maxCpm = filters.maxCpm;
  if (filters.programs?.length) params.programs = filters.programs.join(',');
  if (filters.types?.length) params.types = filters.types.join(',');

  const { data } = await api.get('/offers', { params });
  // Normalize response: backend returns { data: [...], meta: { total, page, ... } }
  const raw = data as any;
  return {
    data: raw.data ?? [],
    total: raw.meta?.total ?? raw.total ?? 0,
    page: raw.meta?.page ?? raw.page ?? 1,
    limit: raw.meta?.limit ?? raw.limit ?? 20,
    totalPages: raw.meta?.totalPages ?? raw.totalPages ?? 1,
  };
};

const fetchOffer = async (id: string): Promise<Offer> => {
  const { data } = await api.get<Offer>(`/offers/${id}`);
  return data;
};

export function useOffers(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, filters],
    queryFn: () => fetchOffers(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useInfiniteOffers(filters: Omit<OfferFilters, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [OFFERS_QUERY_KEY, 'infinite', filters],
    queryFn: ({ pageParam = 1 }) =>
      fetchOffers({ ...filters, page: pageParam as number, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useOffer(id: string) {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, id],
    queryFn: () => fetchOffer(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) =>
      api.post(`/offers/${offerId}/save`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] });
    },
  });
}

export function useUnsaveOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) =>
      api.delete(`/offers/${offerId}/save`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] });
    },
  });
}

export function useSavedOffers() {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, 'saved'],
    queryFn: async () => {
      const { data } = await api.get<Offer[]>('/offers/saved');
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
