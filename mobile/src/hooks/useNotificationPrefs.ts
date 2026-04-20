import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface NotificationPrefs {
  notifyBonus: boolean;
  notifyProgramPairs: string[]; // ex: ["livelo:smiles"]
  notifyWhatsApp: boolean;
  whatsappVerified: boolean;
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ['notification-prefs'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/preferences');
      return data as NotificationPrefs;
    },
    staleTime: 30_000,
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const { data } = await api.put('/notifications/preferences', patch);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });
}

export function useStartWhatsAppVerify() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const { data } = await api.post('/notifications/verify-start', { phone });
      return data as { sent: boolean; phoneMasked: string };
    },
  });
}

export function useConfirmWhatsAppVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/notifications/verify-confirm', { code });
      return data as { verified: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });
}
