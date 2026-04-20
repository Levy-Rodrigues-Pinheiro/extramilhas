import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Mission {
  id: string;
  slug: string;
  title: string;
  description: string;
  targetType: string;
  targetCount: number;
  rewardDays: number;
  progress: number;
  completedAt: string | null;
  rewardClaimedAt: string | null;
  claimed: boolean;
  validFrom: string;
  validTo: string | null;
}

export function useMissions() {
  return useQuery({
    queryKey: ['missions'],
    queryFn: async () => {
      const { data } = await api.get('/missions');
      return data as { count: number; missions: Mission[] };
    },
    staleTime: 30_000,
  });
}

export function useClaimMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (missionId: string) => {
      const { data } = await api.post(`/missions/${missionId}/claim`, {});
      return data as { claimed: boolean; rewardDays: number; newExpiresAt: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}
