import type { MetadataRoute } from 'next';

/**
 * robots.txt gerado em runtime pelo Next.
 * Libera tudo pros crawlers — somos landing pública.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Bloqueia apenas endpoints de query params de link referral
        // (evita duplicate content)
        disallow: '/r/',
      },
    ],
    sitemap: 'https://milhasextras.com.br/sitemap.xml',
  };
}
