import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * User-generated guides. Workflow:
 *   1. User cria em DRAFT → livremente edita
 *   2. Publica pra revisão → PENDING_REVIEW
 *   3. Admin aprova → PUBLISHED (vira público e indexável)
 *   4. OU admin rejeita → REJECTED (com reason)
 *
 * SEO: endpoints públicos retornam apenas PUBLISHED. Slug é auto-gerado do
 * título (rfc-3986 safe).
 */
@Injectable()
export class GuidesService {
  constructor(private prisma: PrismaService) {}

  private slugify(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (
      await (this.prisma as any).userGuide.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      i++;
      slug = `${base}-${i}`;
    }
    return slug;
  }

  // ─── User-facing (autor ou leitor) ──────────────────────────────────

  async listPublished(params: { limit?: number; cursor?: string; tag?: string }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const where: any = { status: 'PUBLISHED' };
    if (params.tag) where.tags = { contains: `"${params.tag}"` };
    const guides = await (this.prisma as any).userGuide.findMany({
      where,
      orderBy: [{ upvoteCount: 'desc' }, { publishedAt: 'desc' }],
      take: limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        tags: true,
        coverImage: true,
        upvoteCount: true,
        viewCount: true,
        publishedAt: true,
        authorId: true,
      },
    });
    let nextCursor: string | null = null;
    if (guides.length > limit) nextCursor = guides.pop().id;

    const authorIds: string[] = Array.from(new Set(guides.map((g: any) => g.authorId as string)));
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a.name]));

    return {
      items: guides.map((g: any) => ({
        ...g,
        authorName: authorMap.get(g.authorId) ?? 'Usuário',
      })),
      nextCursor,
    };
  }

  async getPublishedBySlug(slug: string, viewerUserId?: string) {
    const guide = await (this.prisma as any).userGuide.findUnique({
      where: { slug },
    });
    if (!guide || guide.status !== 'PUBLISHED') {
      throw new NotFoundException('Guia não encontrado');
    }
    // Incrementa view count async (não aguarda)
    (this.prisma as any).userGuide
      .update({ where: { id: guide.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

    const author = await this.prisma.user.findUnique({
      where: { id: guide.authorId },
      select: { id: true, name: true },
    });

    let upvoted = false;
    if (viewerUserId) {
      const uv = await (this.prisma as any).guideUpvote.findUnique({
        where: { guideId_userId: { guideId: guide.id, userId: viewerUserId } },
      });
      upvoted = !!uv;
    }

    return {
      ...guide,
      authorName: author?.name ?? 'Usuário',
      upvotedByMe: upvoted,
    };
  }

  async createDraft(
    userId: string,
    params: { title: string; summary: string; body: string; tags?: string[]; coverImage?: string },
  ) {
    if (params.title.length < 5 || params.body.length < 100) {
      throw new ForbiddenException('Título min 5 chars, body min 100 chars');
    }
    const slug = await this.ensureUniqueSlug(this.slugify(params.title));
    return (this.prisma as any).userGuide.create({
      data: {
        authorId: userId,
        title: params.title.slice(0, 200),
        summary: (params.summary || params.body).slice(0, 280),
        body: params.body.slice(0, 50000),
        tags: JSON.stringify(params.tags ?? []),
        coverImage: params.coverImage ?? null,
        slug,
        status: 'DRAFT',
      },
    });
  }

  async updateDraft(
    userId: string,
    guideId: string,
    params: {
      title?: string;
      summary?: string;
      body?: string;
      tags?: string[];
      coverImage?: string;
    },
  ) {
    const guide = await (this.prisma as any).userGuide.findUnique({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guia não encontrado');
    if (guide.authorId !== userId) throw new ForbiddenException('Sem permissão');
    if (guide.status !== 'DRAFT' && guide.status !== 'REJECTED') {
      throw new ForbiddenException('Só pode editar em DRAFT ou REJECTED');
    }
    return (this.prisma as any).userGuide.update({
      where: { id: guideId },
      data: {
        ...(params.title !== undefined && { title: params.title.slice(0, 200) }),
        ...(params.summary !== undefined && { summary: params.summary.slice(0, 280) }),
        ...(params.body !== undefined && { body: params.body.slice(0, 50000) }),
        ...(params.tags !== undefined && { tags: JSON.stringify(params.tags) }),
        ...(params.coverImage !== undefined && { coverImage: params.coverImage }),
      },
    });
  }

  async submitForReview(userId: string, guideId: string) {
    const guide = await (this.prisma as any).userGuide.findUnique({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guia não encontrado');
    if (guide.authorId !== userId) throw new ForbiddenException('Sem permissão');
    if (!['DRAFT', 'REJECTED'].includes(guide.status)) {
      throw new ForbiddenException('Estado inválido pra submeter');
    }
    return (this.prisma as any).userGuide.update({
      where: { id: guideId },
      data: { status: 'PENDING_REVIEW', rejectionReason: null },
    });
  }

  async listMyGuides(userId: string) {
    return (this.prisma as any).userGuide.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async toggleUpvote(userId: string, guideId: string) {
    const existing = await (this.prisma as any).guideUpvote.findUnique({
      where: { guideId_userId: { guideId, userId } },
    });
    if (existing) {
      await (this.prisma as any).guideUpvote.delete({ where: { id: existing.id } });
      await (this.prisma as any).userGuide.update({
        where: { id: guideId },
        data: { upvoteCount: { decrement: 1 } },
      });
      return { upvoted: false };
    }
    await (this.prisma as any).guideUpvote.create({ data: { guideId, userId } });
    await (this.prisma as any).userGuide.update({
      where: { id: guideId },
      data: { upvoteCount: { increment: 1 } },
    });
    return { upvoted: true };
  }

  // ─── Admin moderation ───────────────────────────────────────────────

  async listPending() {
    return (this.prisma as any).userGuide.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async approve(adminId: string, guideId: string) {
    const guide = await (this.prisma as any).userGuide.findUnique({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guia não encontrado');
    if (guide.status !== 'PENDING_REVIEW') {
      throw new ForbiddenException('Guia não está em revisão');
    }
    return (this.prisma as any).userGuide.update({
      where: { id: guideId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });
  }

  async reject(adminId: string, guideId: string, reason: string) {
    return (this.prisma as any).userGuide.update({
      where: { id: guideId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });
  }
}
