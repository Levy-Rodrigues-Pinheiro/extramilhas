import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface ReferralStats {
  code: string;
  shareUrl: string;
  referralsCount: number;
  activeReferrals: number;
  rewardDays: number;
  referredBy: { name: string } | null;
}

export function useReferral() {
  return useQuery({
    queryKey: ['referral', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/referral/me');
      return data as ReferralStats;
    },
    staleTime: 60_000,
  });
}

export function useApplyReferralCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/referral/apply', { code });
      return data as { applied: boolean; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}
