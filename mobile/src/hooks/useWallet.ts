import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface WalletItem {
  id: string;
  programId: string;
  program: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    avgCpm: number;
  };
  balance: number;
  valueBrl: number;
  expiresAt: string | null;
  daysToExpiry: number | null;
  isExpiringSoon: boolean;
  updatedAt: string;
}

export interface WalletSummary {
  summary: {
    programsCount: number;
    totalBalance: number;
    totalValueBrl: number;
    expiringCount: number;
  };
  items: WalletItem[];
}

const QUERY_KEY = ['wallet', 'summary'];

export function useWallet() {
  return useQuery<WalletSummary>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get('/users/wallet/summary');
      return data as WalletSummary;
    },
    staleTime: 30_000,
  });
}

export function useUpsertBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { programId: string; balance: number; expiresAt?: string }) => {
      const { data } = await api.put('/users/miles-balance', input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const { data } = await api.delete(`/users/miles-balance/${programId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
