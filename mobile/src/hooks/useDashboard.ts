import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export interface DashboardStats {
  savingsTotal: number;
  savingsEstimateNote: string;
  notifications: {
    total: number;
    thisYear: number;
    lastMonth: number;
  };
  alertsConfigured: number;
  missionsCompleted: number;
  walletPrograms: number;
  walletTotalMiles: number;
  generatedAt: string;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data } = await api.get('/users/dashboard/stats');
      return data as DashboardStats;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useExportCsv() {
  return useMutation({
    mutationFn: async (): Promise<{ csv: string; filename: string }> => {
      const { data } = await api.get('/users/dashboard/export');
      return data as { csv: string; filename: string };
    },
  });
}
