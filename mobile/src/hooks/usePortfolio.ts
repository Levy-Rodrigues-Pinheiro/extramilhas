import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface PortfolioBreakdown {
  programId: string;
  programName: string;
  programSlug: string;
  balance: number;
  sharePercent: number;
  valueBrl: number;
  cpm: number;
}

export interface PortfolioSuggestion {
  severity: 'info' | 'warn' | 'critical';
  title: string;
  text: string;
  action?: string;
}

export interface PortfolioAnalysis {
  totalMiles: number;
  totalValueBrl: number;
  concentration: number | null;
  concentrationLabel: string;
  dominantProgram: PortfolioBreakdown | null;
  breakdown: PortfolioBreakdown[];
  suggestions: PortfolioSuggestion[];
}

export interface Signal {
  programId: string;
  programName: string;
  programSlug: string;
  currentCpm: number;
  median30d: number;
  signal: 'BUY_STRONG' | 'BUY' | 'HOLD' | 'SELL';
  text: string;
  ratio: number;
}

export function usePortfolioAnalysis() {
  return useQuery({
    queryKey: ['portfolio', 'analyze'],
    queryFn: async (): Promise<PortfolioAnalysis> => {
      const { data } = await api.get('/users/portfolio/analyze');
      return data as PortfolioAnalysis;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSignals() {
  return useQuery({
    queryKey: ['portfolio', 'signals'],
    queryFn: async (): Promise<Signal[]> => {
      const { data } = await api.get('/users/portfolio/signals');
      return data as Signal[];
    },
    staleTime: 1000 * 60 * 15,
  });
}
