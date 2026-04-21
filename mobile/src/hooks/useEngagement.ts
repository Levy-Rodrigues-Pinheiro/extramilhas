import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  lastActiveDate?: string;
  isNewDay?: boolean;
  streakBroken?: boolean;
  freezeUsed?: boolean;
}

export interface UserGoal {
  id: string;
  title: string;
  programId: string | null;
  targetMiles: number;
  targetDate: string;
  startingMiles: number;
  currentMiles: number;
  progressMiles: number;
  percent: number;
  daysLeft: number;
  dailyMilesNeeded: number;
  isArchived: boolean;
  completedAt: string | null;
}

export function useStreak() {
  return useQuery({
    queryKey: ['engagement', 'streak'],
    queryFn: async (): Promise<StreakState> => {
      const { data } = await api.get('/engagement/streak');
      return data as StreakState;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePingStreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<StreakState> => {
      const { data } = await api.post('/engagement/streak/ping');
      return data as StreakState;
    },
    onSuccess: (data) => {
      qc.setQueryData(['engagement', 'streak'], data);
    },
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ['engagement', 'goals'],
    queryFn: async (): Promise<UserGoal[]> => {
      const { data } = await api.get('/engagement/goals');
      return data as UserGoal[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      title: string;
      programId?: string;
      targetMiles: number;
      targetDate: string;
    }) => {
      const { data } = await api.post('/engagement/goals', params);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engagement', 'goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/engagement/goals/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engagement', 'goals'] }),
  });
}

export function useArchiveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/engagement/goals/${id}/archive`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engagement', 'goals'] }),
  });
}
