import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export interface TransferCalcInput {
  fromProgramSlug: string;
  points: number;
  toProgramSlug?: string;
}

export interface TransferCalcResult {
  fromProgram: { slug: string; name: string; avgCpm: number };
  inputPoints: number;
  inputValueBrl: number;
  results: Array<{
    toProgram: { slug: string; name: string; avgCpm: number };
    bonusActive: number;
    expiresAt: string | null;
    resultingMiles: number;
    resultingValueBrl: number;
    valueGainBrl: number;
    gainPercent: number;
    recommendation: 'TRANSFERIR' | 'ESPERAR' | 'NAO_TRANSFERIR';
    reasoning: string;
    examples?: Array<{ destination: string; milesNeeded: number; tripsPossible: number }>;
  }>;
}

export function useTransferCalculator() {
  return useMutation<TransferCalcResult, Error, TransferCalcInput>({
    mutationFn: async (input) => {
      const { data } = await api.post('/arbitrage/calculate', input);
      return data as TransferCalcResult;
    },
  });
}

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
  // Novos campos do gate de plano — podem não existir em builds antigas do backend
  lockedCount?: number;
  plan?: 'FREE' | 'PREMIUM' | 'PRO';
  shouldUpsell?: boolean;
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
