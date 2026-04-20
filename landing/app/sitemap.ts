import type { MetadataRoute } from 'next';
import { getAllPosts } from './blog/posts';

/**
 * sitemap.xml dinâmico. Páginas estáticas + blog posts + /programs.
 * Google descobre tudo em 1 crawl.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://milhasextras.com.br';
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/programs`, lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/contato`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
