import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import type { TransferPartnership, TransferCalculation } from '../types';

export function useTransferPartnerships() {
  return useQuery({
    queryKey: ['transfers', 'partnerships'],
    queryFn: async () => { const { data } = await api.get('/transfers/partnerships'); return data as TransferPartnership[]; },
  });
}

export function useCalculateTransfer() {
  return useMutation({
    mutationFn: async (params: { fromProgramId: string; toProgramId: string; points: number }) => {
      const { data } = await api.post('/transfers/calculate', params);
      return data as TransferCalculation;
    },
  });
}
