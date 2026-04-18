import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Article, ArticlesResponse } from '../types';

const ARTICLES_KEY = 'articles';

export function useArticles() {
  return useQuery({
    queryKey: [ARTICLES_KEY],
    queryFn: async (): Promise<ArticlesResponse> => {
      const { data } = await api.get<ArticlesResponse>('/articles');
      return data;
    },
    staleTime: 1000 * 60 * 15,
  });
}

export function useArticle(slug: string) {
  return useQuery({
    queryKey: [ARTICLES_KEY, slug],
    queryFn: async (): Promise<Article> => {
      const { data } = await api.get<Article>(`/articles/${slug}`);
      return data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 15,
  });
}
