import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { FamilyMember } from '../types';

export function useFamily() {
  return useQuery({
    queryKey: ['family'],
    queryFn: async () => { const { data } = await api.get('/users/family'); return data as FamilyMember[]; },
  });
}

export function useAddFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { name: string; relationship: string }) => { const { data } = await api.post('/users/family', p); return data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  });
}

export function useDeleteFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/family/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  });
}
