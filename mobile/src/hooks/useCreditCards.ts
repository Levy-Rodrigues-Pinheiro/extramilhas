import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface CardBreakdown {
  pointsPerMonth: number;
  yearlyPoints: number;
  welcomePoints: number;
  totalPointsYear: number;
  cpmUsed: number;
  valueBrlYear: number;
  annualFeeBrl: number;
  netRoiBrl: number;
  avgMultiplier: number;
}

export interface CardRecommendation {
  card: {
    id: string;
    name: string;
    issuer: string;
    brand: string;
    tier: string;
    logoUrl: string | null;
    officialUrl: string | null;
    mainProgramSlug: string;
  };
  breakdown: CardBreakdown;
  reasoning: string;
}

export interface RecommendResult {
  topRecommendation: CardRecommendation | null;
  alternatives: CardRecommendation[];
  allEligibleCount: number;
  totalCardsInCatalog: number;
  disclaimer: string;
}

export function useRecommendCards() {
  return useMutation({
    mutationFn: async (params: {
      monthlySpendBrl: number;
      monthlyIncomeBrl?: number;
      categories?: Record<string, number>;
    }): Promise<RecommendResult> => {
      const { data } = await api.post('/credit-cards/recommend', params);
      return data as RecommendResult;
    },
  });
}

export function useCardCatalog() {
  return useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const { data } = await api.get('/credit-cards');
      return data as Array<{
        id: string;
        name: string;
        issuer: string;
        brand: string;
        tier: string;
        logoUrl: string | null;
        mainProgramSlug: string;
        annualFeeBrl: number;
      }>;
    },
    staleTime: 1000 * 60 * 60,
  });
}

export interface CompareResult {
  current: {
    card: {
      id: string;
      name: string;
      issuer: string;
      tier: string;
      logoUrl: string | null;
      mainProgramSlug: string;
    };
    yearlyPoints: number;
    welcomePoints: number;
    totalPointsYear: number;
    cpmUsed: number;
    valueBrlYear: number;
    annualFeeBrl: number;
    netRoiBrl: number;
  };
  new: CompareResult['current'];
  comparison: {
    deltaRoiBrl: number;
    deltaPercent: number | null;
    verdict: string;
    recommendation: 'SWITCH' | 'STAY' | 'NEUTRAL';
  };
}

export function useCompareCards() {
  return useMutation({
    mutationFn: async (params: {
      currentCardId: string;
      newCardId: string;
      monthlySpendBrl: number;
      categories?: Record<string, number>;
    }): Promise<CompareResult> => {
      const { data } = await api.post('/credit-cards/compare', params);
      return data as CompareResult;
    },
  });
}
