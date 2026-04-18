import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { UserProfile, UpdateBalancesPayload, MilesBalance } from '../types';

const PROFILE_KEY = 'profile';

export function useProfile() {
  return useQuery({
    queryKey: [PROFILE_KEY],
    queryFn: async (): Promise<UserProfile> => {
      const { data } = await api.get<UserProfile>('/users/profile');
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateBalances() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBalancesPayload) =>
      api.put('/users/balances', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; avatar?: string }) =>
      api.patch('/users/profile', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] });
    },
  });
}

export function useExpiringBalances() {
  return useQuery({
    queryKey: ['miles', 'expiring'],
    queryFn: async () => { const { data } = await api.get('/users/miles-expiring'); return data as MilesBalance[]; },
    staleTime: 1000 * 60 * 10,
  });
}
