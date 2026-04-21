import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Community: forum threads + posts + polls.
 *
 * Moderação simples: 3+ reports flagged → oculta automático (hiddenAt).
 * Admin pode unflag manualmente via UPDATE direto no DB (interface dedicada
 * fica pra próxima iteração).
 */
@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  // ─── Forum threads ──────────────────────────────────────────────────

  async listThreads(params: { tag?: string; limit?: number; cursor?: string }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const where: any = { hiddenAt: null };
    if (params.tag) where.tag = params.tag;
    const threads = await (this.prisma as any).forumThread.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
    });
    let nextCursor: string | null = null;
    if (threads.length > limit) {
      nextCursor = threads.pop().id;
    }

    // Enriquece com authorName (join mais barato do que relation)
    const authorIds: string[] = Array.from(new Set(threads.map((t: any) => t.authorId as string)));
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a.name]));

    return {
      items: threads.map((t: any) => ({
        ...t,
        authorName: authorMap.get(t.authorId) ?? 'Usuário',
      })),
      nextCursor,
    };
  }

  async getThread(threadId: string) {
    const thread = await (this.prisma as any).forumThread.findUnique({
      where: { id: threadId },
    });
    if (!thread || thread.hiddenAt) throw new NotFoundException('Thread não encontrada');
    const posts = await (this.prisma as any).forumPost.findMany({
      where: { threadId, hiddenAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const authorIds: string[] = Array.from(
      new Set([thread.authorId as string, ...posts.map((p: any) => p.authorId as string)]),
    );
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a.name]));

    return {
      thread: { ...thread, authorName: authorMap.get(thread.authorId) ?? 'Usuário' },
      posts: posts.map((p: any) => ({
        ...p,
        authorName: authorMap.get(p.authorId) ?? 'Usuário',
      })),
    };
  }

  async createThread(userId: string, params: { title: string; body: string; tag?: string }) {
    if (!params.title?.trim() || !params.body?.trim()) {
      throw new ForbiddenException('Título e corpo são obrigatórios');
    }
    return (this.prisma as any).forumThread.create({
      data: {
        authorId: userId,
        title: params.title.trim().slice(0, 200),
        body: params.body.trim().slice(0, 5000),
        tag: (params.tag ?? 'GERAL').toUpperCase(),
      },
    });
  }

  async createPost(userId: string, threadId: string, body: string) {
    if (!body?.trim()) throw new ForbiddenException('Corpo vazio');
    const thread = await (this.prisma as any).forumThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.hiddenAt) throw new NotFoundException('Thread não encontrada');
    const [post] = await this.prisma.$transaction([
      (this.prisma as any).forumPost.create({
        data: { threadId, authorId: userId, body: body.trim().slice(0, 5000) },
      }),
      (this.prisma as any).forumThread.update({
        where: { id: threadId },
        data: { replyCount: { increment: 1 }, updatedAt: new Date() },
      }),
    ]);
    return post;
  }

  async deleteOwnThread(userId: string, threadId: string) {
    const thread = await (this.prisma as any).forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread não encontrada');
    if (thread.authorId !== userId) throw new ForbiddenException('Sem permissão');
    await (this.prisma as any).forumThread.update({
      where: { id: threadId },
      data: { hiddenAt: new Date() },
    });
    return { deleted: true };
  }

  // ─── Polls ──────────────────────────────────────────────────────────

  async listActivePolls() {
    const now = new Date();
    const polls = await (this.prisma as any).poll.findMany({
      where: {
        isActive: true,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Enriquece com vote counts por opção
    const withCounts = await Promise.all(
      polls.map(async (p: any) => {
        const votes = await (this.prisma as any).pollVote.groupBy({
          by: ['optionId'],
          where: { pollId: p.id },
          _count: { _all: true },
        });
        const voteMap: Record<string, number> = {};
        for (const v of votes) voteMap[v.optionId] = v._count._all;
        let options: Array<{ id: string; label: string; votes: number }> = [];
        try {
          const rawOptions = JSON.parse(p.options);
          if (Array.isArray(rawOptions)) {
            options = rawOptions.map((o: any) => ({
              id: o.id,
              label: o.label,
              votes: voteMap[o.id] ?? 0,
            }));
          }
        } catch {
          /* options corrompido */
        }
        const totalVotes = options.reduce((s, o) => s + o.votes, 0);
        return { ...p, options, totalVotes };
      }),
    );

    return withCounts;
  }

  async vote(userId: string, pollId: string, optionId: string) {
    const poll = await (this.prisma as any).poll.findUnique({ where: { id: pollId } });
    if (!poll || !poll.isActive) throw new NotFoundException('Enquete não encontrada');
    if (poll.endsAt && poll.endsAt < new Date()) {
      throw new ForbiddenException('Enquete encerrada');
    }
    // Valida optionId contra options
    let validOption = false;
    try {
      const opts = JSON.parse(poll.options);
      validOption = Array.isArray(opts) && opts.some((o: any) => o.id === optionId);
    } catch {
      /* ignore */
    }
    if (!validOption) throw new ForbiddenException('Opção inválida');

    // Upsert — user pode mudar voto
    await (this.prisma as any).pollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      create: { pollId, userId, optionId },
      update: { optionId },
    });
    return { voted: true, optionId };
  }

  async myVote(userId: string, pollId: string) {
    const v = await (this.prisma as any).pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    return v?.optionId ?? null;
  }
}
