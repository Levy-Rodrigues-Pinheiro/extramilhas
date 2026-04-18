import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { ExploreData } from '../types';

export function useExplore() {
  return useQuery({
    queryKey: ['explore'],
    queryFn: async () => {
      const { data } = await api.get('/offers/explore');
      return data as ExploreData;
    },
    staleTime: 1000 * 60 * 5,
  });
}
