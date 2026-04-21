import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PodcastService {
  constructor(private prisma: PrismaService) {}

  async listPublished() {
    return (this.prisma as any).podcastEpisode.findMany({
      where: { isPublished: true },
      orderBy: [{ episodeNumber: 'desc' }, { publishedAt: 'desc' }],
    });
  }

  async getBySlug(slug: string) {
    const ep = await (this.prisma as any).podcastEpisode.findUnique({
      where: { slug },
    });
    if (!ep || !ep.isPublished) throw new NotFoundException('Episódio não disponível');
    (this.prisma as any).podcastEpisode
      .update({ where: { id: ep.id }, data: { playCount: { increment: 1 } } })
      .catch(() => {});
    return ep;
  }

  async adminUpsert(params: {
    slug: string;
    title: string;
    description: string;
    audioUrl: string;
    durationSec: number;
    episodeNumber?: number;
    coverImage?: string;
    isPublished?: boolean;
  }) {
    const data: any = {
      title: params.title.slice(0, 200),
      description: params.description.slice(0, 5000),
      audioUrl: params.audioUrl,
      durationSec: params.durationSec,
      episodeNumber: params.episodeNumber,
      coverImage: params.coverImage,
      isPublished: params.isPublished ?? false,
      publishedAt: params.isPublished ? new Date() : null,
    };
    return (this.prisma as any).podcastEpisode.upsert({
      where: { slug: params.slug },
      create: { slug: params.slug, ...data },
      update: data,
    });
  }

  /**
   * RSS 2.0 feed pro podcast. Clients como Spotify/Apple Podcasts
   * consomem daqui.
   */
  async getRssFeed(baseUrl: string): Promise<string> {
    const episodes = await this.listPublished();
    const items = episodes.map((ep: any) => `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.description}]]></description>
      <pubDate>${new Date(ep.publishedAt || ep.createdAt).toUTCString()}</pubDate>
      <enclosure url="${ep.audioUrl}" length="0" type="audio/mpeg"/>
      <guid isPermaLink="false">${ep.id}</guid>
      <itunes:duration>${ep.durationSec}</itunes:duration>
      ${ep.episodeNumber ? `<itunes:episode>${ep.episodeNumber}</itunes:episode>` : ''}
    </item>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Milhas Extras Podcast</title>
    <description>Dicas práticas de milhas, arbitragem e travel hacking brasileiro.</description>
    <link>${baseUrl}</link>
    <language>pt-BR</language>
    <itunes:category text="Business"/>
    ${items}
  </channel>
</rss>`;
  }
}
