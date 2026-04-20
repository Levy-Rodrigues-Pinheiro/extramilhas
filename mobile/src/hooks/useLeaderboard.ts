import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export type ReporterTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  approvedCount: number;
  tier: ReporterTier;
  rank: number;
}

export interface MyStats {
  approvedCount: number;
  tier: ReporterTier;
  rank: number | null;
  nextTier: { needed: number; threshold: number; name: ReporterTier } | null;
}

export function useLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ['leaderboard', 'reporters', limit],
    queryFn: async () => {
      const { data } = await api.get(`/leaderboard/reporters?limit=${limit}`);
      return data as { count: number; reporters: LeaderboardEntry[] };
    },
    staleTime: 60_000,
  });
}

export function useMyLeaderboardStats() {
  return useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/leaderboard/me');
      return data as MyStats;
    },
    staleTime: 30_000,
    retry: false,
  });
}

// Metadados visuais do tier (cor, label, emoji)
export const TIER_META: Record<
  ReporterTier,
  { label: string; emoji: string; color: string; bg: string }
> = {
  BRONZE: { label: 'Bronze', emoji: '🥉', color: '#D97706', bg: '#451A03' },
  SILVER: { label: 'Prata', emoji: '🥈', color: '#94A3B8', bg: '#1E293B' },
  GOLD: { label: 'Ouro', emoji: '🥇', color: '#F59E0B', bg: '#451A03' },
  PLATINUM: { label: 'Platina', emoji: '💎', color: '#60A5FA', bg: '#1E3A8A' },
};
