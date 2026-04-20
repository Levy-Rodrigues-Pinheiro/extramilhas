import type { MetadataRoute } from 'next';

/**
 * sitemap.xml dinâmico. Páginas estáticas + FAQ section anchors.
 * Google descobre tudo em 1 crawl.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://milhasextras.com.br';
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
