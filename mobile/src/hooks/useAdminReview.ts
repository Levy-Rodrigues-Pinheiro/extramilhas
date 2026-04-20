import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface BonusReport {
  id: string;
  reporterId: string | null;
  reporterEmail: string | null;
  fromProgramSlug: string;
  toProgramSlug: string;
  bonusPercent: number;
  expiresAt: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DUPLICATE';
  adminNotes: string | null;
  createdAt: string;
  reporter?: { id: string; email: string; name: string };
}

export function usePendingReports() {
  return useQuery({
    queryKey: ['admin', 'bonus-reports', 'pending'],
    queryFn: async () => {
      const { data } = await api.get('/admin/bonus-reports?status=PENDING');
      return data as { count: number; reports: BonusReport[] };
    },
    staleTime: 15_000,
  });
}

export function useReportById(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'bonus-reports', 'detail', id],
    queryFn: async () => {
      // Não tem endpoint de detail — uso lista filtrada pra extrair
      const { data } = await api.get('/admin/bonus-reports?status=PENDING');
      const r = (data as any).reports?.find((x: BonusReport) => x.id === id);
      return r as BonusReport | undefined;
    },
    enabled: !!id,
  });
}

export function useReviewReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      action: 'approve' | 'reject';
      adminNotes?: string;
    }) => {
      const { data } = await api.put(
        `/admin/bonus-reports/${params.id}/${params.action}`,
        { adminNotes: params.adminNotes },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bonus-reports'] });
      qc.invalidateQueries({ queryKey: ['arbitrage'] });
    },
  });
}
