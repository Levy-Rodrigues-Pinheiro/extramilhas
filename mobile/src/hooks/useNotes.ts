import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string;
  remindAt: string | null;
  remindSent: boolean;
  tag: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async (): Promise<Note[]> => {
      const { data } = await api.get('/notes');
      return data;
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      title: string;
      body: string;
      tag?: string;
      remindAt?: string;
      recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    }) => {
      const { data } = await api.post('/notes', params);
      return data as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      title?: string;
      body?: string;
      tag?: string;
      remindAt?: string | null;
      recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
      isPinned?: boolean;
      isArchived?: boolean;
    }) => {
      const { id, ...rest } = params;
      const { data } = await api.put(`/notes/${id}`, rest);
      return data as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/notes/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });
}
