import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface CreateBonusReportInput {
  fromProgramSlug: string;
  toProgramSlug: string;
  bonusPercent: number;
  expiresAt?: string;
  screenshotUrl?: string;
  notes?: string;
  reporterEmail?: string;
}

export interface BonusReport {
  id: string;
  fromProgramSlug: string;
  toProgramSlug: string;
  bonusPercent: number;
  expiresAt: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DUPLICATE';
  adminNotes: string | null;
  createdAt: string;
}

export function useCreateBonusReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBonusReportInput) => {
      const { data } = await api.post('/bonus-reports', input);
      return data as { id: string; status: string; isDuplicate: boolean; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bonus-reports', 'mine'] });
      qc.invalidateQueries({ queryKey: ['arbitrage'] });
    },
  });
}

export function useMyBonusReports() {
  return useQuery({
    queryKey: ['bonus-reports', 'mine'],
    queryFn: async () => {
      const { data } = await api.get('/bonus-reports/mine');
      return data as {
        count: number;
        reports: BonusReport[];
        stats: { pending: number; approved: number; rejected: number; duplicate: number };
      };
    },
    staleTime: 30_000,
  });
}
