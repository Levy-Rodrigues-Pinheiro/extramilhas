import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface ForumThread {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  tag: string;
  replyCount: number;
  upvoteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ThreadsPage {
  items: ForumThread[];
  nextCursor: string | null;
}

export interface ThreadDetail {
  thread: ForumThread;
  posts: ForumPost[];
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  endsAt: string | null;
  totalVotes: number;
  createdAt: string;
}

export function useForumThreads(tag?: string) {
  return useQuery({
    queryKey: ['community', 'threads', tag ?? 'all'],
    queryFn: async (): Promise<ThreadsPage> => {
      const { data } = await api.get('/community/threads', { params: tag ? { tag } : undefined });
      return data as ThreadsPage;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useThreadDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['community', 'thread', id],
    queryFn: async (): Promise<ThreadDetail> => {
      const { data } = await api.get(`/community/threads/${id}`);
      return data as ThreadDetail;
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; body: string; tag?: string }) => {
      const { data } = await api.post('/community/threads', params);
      return data as ForumThread;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'threads'] }),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { threadId: string; body: string }) => {
      const { data } = await api.post(`/community/threads/${params.threadId}/posts`, {
        body: params.body,
      });
      return data as ForumPost;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['community', 'thread', vars.threadId] });
      qc.invalidateQueries({ queryKey: ['community', 'threads'] });
    },
  });
}

export function usePolls() {
  return useQuery({
    queryKey: ['community', 'polls'],
    queryFn: async (): Promise<Poll[]> => {
      const { data } = await api.get('/community/polls');
      return data as Poll[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { pollId: string; optionId: string }) => {
      const { data } = await api.post(`/community/polls/${params.pollId}/vote`, {
        optionId: params.optionId,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'polls'] }),
  });
}
