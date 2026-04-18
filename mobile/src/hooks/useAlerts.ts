import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Alert, CreateAlertPayload } from '../types';

const ALERTS_KEY = 'alerts';

const fetchAlerts = async (): Promise<Alert[]> => {
  const { data } = await api.get<Alert[]>('/alerts');
  return data;
};

export function useAlerts() {
  return useQuery({
    queryKey: [ALERTS_KEY],
    queryFn: fetchAlerts,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAlertPayload) =>
      api.post<Alert>('/alerts', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ALERTS_KEY] });
    },
  });
}

export function useToggleAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<Alert>(`/alerts/${id}`, { isActive }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ALERTS_KEY] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/alerts/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ALERTS_KEY] });
    },
  });
}
