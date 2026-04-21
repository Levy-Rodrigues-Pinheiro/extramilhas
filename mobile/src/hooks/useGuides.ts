import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface GuideSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tags: string;
  coverImage: string | null;
  upvoteCount: number;
  viewCount: number;
  publishedAt: string;
  authorId: string;
  authorName: string;
}

export interface GuideDetail extends GuideSummary {
  body: string;
  upvotedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useGuides(tag?: string) {
  return useQuery({
    queryKey: ['guides', tag ?? 'all'],
    queryFn: async (): Promise<{ items: GuideSummary[]; nextCursor: string | null }> => {
      const { data } = await api.get('/guides', { params: tag ? { tag } : undefined });
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useGuideBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['guide', slug],
    queryFn: async (): Promise<GuideDetail> => {
      const { data } = await api.get(`/guides/${slug}`);
      return data as GuideDetail;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyGuides() {
  return useQuery({
    queryKey: ['guides', 'mine'],
    queryFn: async (): Promise<GuideDetail[]> => {
      const { data } = await api.get('/guides/my/list');
      return data;
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      title: string;
      summary: string;
      body: string;
      tags?: string[];
      coverImage?: string;
    }) => {
      const { data } = await api.post('/guides', params);
      return data as GuideDetail;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guides'] }),
  });
}

export function useSubmitGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/guides/${id}/submit`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guides'] }),
  });
}

export function useToggleUpvote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/guides/${id}/upvote`);
      return data as { upvoted: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guides'] }),
  });
}
