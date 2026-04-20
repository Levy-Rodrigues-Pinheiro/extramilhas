import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: any;
  createdAt: string;
}

export function useNotificationFeed() {
  return useQuery({
    queryKey: ['notifications-feed'],
    queryFn: async () => {
      const { data } = await api.get('/notifications-feed');
      return data as {
        count: number;
        unreadCount: number;
        notifications: InAppNotification[];
      };
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/notifications-feed/${id}/read`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-feed'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications-feed/read-all', {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-feed'] }),
  });
}
