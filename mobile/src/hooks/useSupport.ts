import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  resolvedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  body: string;
  isFromAdmin: boolean;
  createdAt: string;
}

export interface TicketDetail {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

export function useMyTickets() {
  return useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data } = await api.get('/support/tickets');
      return data;
    },
    staleTime: 1000 * 30,
  });
}

export function useTicketDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['support', 'ticket', id],
    queryFn: async (): Promise<TicketDetail> => {
      const { data } = await api.get(`/support/tickets/${id}`);
      return data as TicketDetail;
    },
    enabled: !!id,
    refetchInterval: 10_000, // polling leve enquanto aberto
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { subject: string; category: string; body: string }) => {
      const { data } = await api.post('/support/tickets', params);
      return data as TicketDetail;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}

export function usePostTicketMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { ticketId: string; body: string }) => {
      const { data } = await api.post(`/support/tickets/${params.ticketId}/messages`, {
        body: params.body,
      });
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['support', 'ticket', vars.ticketId] });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { data } = await api.post(`/support/tickets/${ticketId}/close`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support'] }),
  });
}
