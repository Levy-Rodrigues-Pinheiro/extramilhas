import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Support tickets simples. User cria ticket → admin vê na fila → responde →
 * user recebe notificação → pode responder de volta.
 *
 * Status flow:
 *   OPEN → (admin responde) → AWAITING_USER → (user responde) → OPEN → ...
 *   Qualquer estado → (admin ou user fecha) → RESOLVED → (24h sem atividade) → CLOSED
 *
 * Prioridade: LOW | NORMAL | HIGH | URGENT. Admin define. BILLING+BUG entram
 * como NORMAL default; se user marcar URGENT via UI, admin revalida.
 */
@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  // ─── User side ──────────────────────────────────────────────────────

  async createTicket(
    userId: string,
    params: { subject: string; category: string; body: string },
  ) {
    if (!params.subject?.trim() || params.subject.length < 5) {
      throw new ForbiddenException('Assunto muito curto');
    }
    if (!params.body?.trim() || params.body.length < 10) {
      throw new ForbiddenException('Mensagem muito curta');
    }
    const ticket = await (this.prisma as any).supportTicket.create({
      data: {
        userId,
        subject: params.subject.slice(0, 200),
        category: params.category || 'GENERAL',
        status: 'OPEN',
        priority: params.category === 'BILLING' ? 'HIGH' : 'NORMAL',
        lastActivityAt: new Date(),
      },
    });
    await (this.prisma as any).supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: userId,
        body: params.body.slice(0, 5000),
      },
    });
    return this.getTicket(userId, ticket.id);
  }

  async listMyTickets(userId: string) {
    return (this.prisma as any).supportTicket.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' },
      take: 50,
    });
  }

  async getTicket(userId: string, ticketId: string, includeInternal = false) {
    const ticket = await (this.prisma as any).supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    // User só vê seu próprio (a menos que chamada vier do admin service)
    if (!includeInternal && ticket.userId !== userId) {
      throw new ForbiddenException('Sem permissão');
    }
    const messages = await (this.prisma as any).supportMessage.findMany({
      where: {
        ticketId,
        ...(includeInternal ? {} : { isInternal: false }),
      },
      orderBy: { createdAt: 'asc' },
    });

    const authorIds: string[] = Array.from(new Set(messages.map((m: any) => m.authorId as string)));
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true, isAdmin: true },
    });
    const authorMap = new Map(
      authors.map((a) => [a.id, { name: a.name, isAdmin: a.isAdmin }]),
    );

    return {
      ticket,
      messages: messages.map((m: any) => {
        const author = authorMap.get(m.authorId);
        return {
          ...m,
          authorName: author?.name ?? 'Usuário',
          isFromAdmin: author?.isAdmin ?? false,
        };
      }),
    };
  }

  async postMessage(userId: string, ticketId: string, body: string, isAdminCaller = false) {
    const ticket = await (this.prisma as any).supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    if (!isAdminCaller && ticket.userId !== userId) {
      throw new ForbiddenException('Sem permissão');
    }
    if (['RESOLVED', 'CLOSED'].includes(ticket.status) && !isAdminCaller) {
      throw new ForbiddenException('Ticket encerrado — abra um novo se precisar');
    }
    if (!body?.trim()) throw new ForbiddenException('Mensagem vazia');

    const msg = await (this.prisma as any).supportMessage.create({
      data: {
        ticketId,
        authorId: userId,
        body: body.trim().slice(0, 5000),
      },
    });

    // Update status + lastActivityAt
    const newStatus = isAdminCaller ? 'AWAITING_USER' : 'OPEN';
    await (this.prisma as any).supportTicket.update({
      where: { id: ticketId },
      data: { status: newStatus, lastActivityAt: new Date() },
    });

    // Se admin respondeu, criar notif pro user
    if (isAdminCaller) {
      await this.prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: `💬 Resposta do suporte: "${ticket.subject.slice(0, 50)}"`,
          body: body.slice(0, 200),
          type: 'support_reply',
          data: JSON.stringify({ ticketId }),
        },
      });
    }

    return msg;
  }

  async closeTicket(userId: string, ticketId: string, isAdminCaller = false) {
    const ticket = await (this.prisma as any).supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    if (!isAdminCaller && ticket.userId !== userId) {
      throw new ForbiddenException('Sem permissão');
    }
    await (this.prisma as any).supportTicket.update({
      where: { id: ticketId },
      data: { status: 'RESOLVED', resolvedAt: new Date(), lastActivityAt: new Date() },
    });
    return { closed: true };
  }

  // ─── Admin side ─────────────────────────────────────────────────────

  async adminListTickets(params: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.assignedTo) where.assignedTo = params.assignedTo;

    const tickets = await (this.prisma as any).supportTicket.findMany({
      where,
      orderBy: [
        // URGENT > HIGH > NORMAL > LOW (alfa não serve, ordenamos em memória)
        { lastActivityAt: 'asc' },
      ],
      take: params.limit ?? 50,
    });

    const userIds: string[] = Array.from(new Set(tickets.map((t: any) => t.userId as string)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, subscriptionPlan: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Re-sort por prioridade + lastActivityAt
    const priRank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    const sorted = tickets
      .map((t: any) => ({ ...t, user: userMap.get(t.userId) ?? null }))
      .sort((a: any, b: any) => {
        const p = (priRank[a.priority] ?? 5) - (priRank[b.priority] ?? 5);
        if (p !== 0) return p;
        return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
      });

    return sorted;
  }

  async adminAssignTicket(adminId: string, ticketId: string) {
    return (this.prisma as any).supportTicket.update({
      where: { id: ticketId },
      data: { assignedTo: adminId },
    });
  }

  async adminSetPriority(ticketId: string, priority: string) {
    const valid = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!valid.includes(priority)) throw new ForbiddenException('Prioridade inválida');
    return (this.prisma as any).supportTicket.update({
      where: { id: ticketId },
      data: { priority },
    });
  }

  async adminGetStats() {
    const [open, awaiting, resolved, unassigned] = await Promise.all([
      (this.prisma as any).supportTicket.count({ where: { status: 'OPEN' } }),
      (this.prisma as any).supportTicket.count({ where: { status: 'AWAITING_USER' } }),
      (this.prisma as any).supportTicket.count({
        where: { status: 'RESOLVED', resolvedAt: { gte: new Date(Date.now() - 30 * 86400_000) } },
      }),
      (this.prisma as any).supportTicket.count({
        where: { status: 'OPEN', assignedTo: null },
      }),
    ]);
    return {
      open,
      awaiting,
      resolvedLast30d: resolved,
      unassigned,
    };
  }
}
