import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import type { ValueComparison } from '../types';

export function useCompareValue() {
  return useMutation({
    mutationFn: async (p: { milesRequired: number; cpmProgram: number; cashPriceBrl: number }) => {
      const { data } = await api.post('/calculator/compare-value', p);
      return data as ValueComparison;
    },
  });
}
