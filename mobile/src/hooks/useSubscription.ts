import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Subscription, SubscriptionPlanDetails } from '../types';

const SUB_KEY = 'subscription';

export function useSubscription() {
  return useQuery({
    queryKey: [SUB_KEY],
    queryFn: async (): Promise<Subscription | null> => {
      const { data } = await api.get<Subscription | null>('/subscriptions/current');
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: [SUB_KEY, 'plans'],
    queryFn: async (): Promise<SubscriptionPlanDetails[]> => {
      const { data } = await api.get<SubscriptionPlanDetails[]>('/subscriptions/plans');
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useSubscribePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string): Promise<Subscription> =>
      api.post<Subscription>('/subscriptions', { planId }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUB_KEY] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<void> =>
      api.delete('/subscriptions/current').then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUB_KEY] });
    },
  });
}
