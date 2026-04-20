import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface ReviewSummary {
  total: number;
  worked: number;
  notWorked: number;
  percentWorked: number | null;
  myReview: { worked: boolean; comment: string | null } | null;
}

export function useReviewSummary(partnershipId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: ['reviews', partnershipId, userId],
    queryFn: async (): Promise<ReviewSummary> => {
      const { data } = await api.get(`/reviews/partnership/${partnershipId}/summary`, {
        params: userId ? { userId } : undefined,
      });
      return data as ReviewSummary;
    },
    enabled: !!partnershipId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpsertReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { partnershipId: string; worked: boolean; comment?: string }) => {
      const { data } = await api.post(`/reviews/partnership/${params.partnershipId}`, {
        worked: params.worked,
        comment: params.comment,
      });
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['reviews', vars.partnershipId] });
    },
  });
}
