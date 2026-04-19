import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface TransferOpportunity {
  id: string;
  fromProgram: { id: string; slug: string; name: string; avgCpm: number };
  toProgram: { id: string; slug: string; name: string; avgCpm: number };
  baseRate: number;
  currentBonus: number;
  expiresAt: string | null;
  effectiveCpm: number;
  valueGainPer1000: number;
  gainPercent: number;
  userSourceBalance?: number;
  potentialResultingMiles?: number;
  potentialValueGain?: number;
  classification: 'IMPERDIVEL' | 'BOA' | 'NORMAL';
  summary: string;
}

interface Payload {
  count: number;
  opportunities: TransferOpportunity[];
  isPersonalized: boolean;
}

export function useTransferBonuses() {
  return useQuery<Payload>({
    queryKey: ['arbitrage', 'transfer-bonuses'],
    queryFn: async () => {
      const { data } = await api.get('/arbitrage/transfer-bonuses');
      // O interceptor já desembrulha {success, data}, então data é Payload
      return data as Payload;
    },
    staleTime: 5 * 60 * 1000, // 5 min — bônus não mudam toda hora
  });
}
