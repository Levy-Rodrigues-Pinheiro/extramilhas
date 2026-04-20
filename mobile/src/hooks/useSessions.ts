import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface ActiveSession {
  id: string;
  platform: string;
  appVersion: string | null;
  lastUsedAt: string;
  createdAt: string;
  isRecent: boolean;
  ageDays: number;
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async (): Promise<ActiveSession[]> => {
      const { data } = await api.get('/users/sessions');
      return data as ActiveSession[];
    },
    staleTime: 1000 * 60,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/sessions/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
