import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(params: {
    name: string;
    email: string;
    category?: string;
    subject: string;
    body: string;
  }) {
    const email = params.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ForbiddenException('Email inválido');
    }
    // Rate limit básico: max 5 mensagens do mesmo email em 1h
    const last = await (this.prisma as any).contactMessage.count({
      where: { email, createdAt: { gte: new Date(Date.now() - 3600_000) } },
    });
    if (last >= 5) {
      throw new ForbiddenException(
        'Muitos pedidos no último 1h. Aguarde antes de enviar novamente.',
      );
    }
    const validCategories = ['GENERAL', 'PARTNERSHIP', 'PRESS', 'COMPLAINT', 'BUG'];
    const category = validCategories.includes((params.category ?? '').toUpperCase())
      ? params.category!.toUpperCase()
      : 'GENERAL';
    return (this.prisma as any).contactMessage.create({
      data: {
        name: params.name.slice(0, 200),
        email,
        category,
        subject: params.subject.slice(0, 200),
        body: params.body.slice(0, 10000),
      },
    });
  }

  async adminList(params: { status?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 50, 200);
    return (this.prisma as any).contactMessage.findMany({
      where: params.status ? { status: params.status.toUpperCase() } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async adminUpdate(
    messageId: string,
    adminId: string,
    params: { status?: string; internalNotes?: string },
  ) {
    const msg = await (this.prisma as any).contactMessage.findUnique({
      where: { id: messageId },
    });
    if (!msg) throw new NotFoundException('Mensagem não encontrada');
    const valid = ['NEW', 'READ', 'REPLIED', 'ARCHIVED'];
    const data: any = {};
    if (params.status && valid.includes(params.status.toUpperCase())) {
      data.status = params.status.toUpperCase();
      if (['READ', 'REPLIED'].includes(data.status) && !msg.handledBy) {
        data.handledBy = adminId;
        data.handledAt = new Date();
      }
    }
    if (params.internalNotes !== undefined) {
      data.internalNotes = params.internalNotes.slice(0, 5000);
    }
    return (this.prisma as any).contactMessage.update({
      where: { id: messageId },
      data,
    });
  }

  async adminStats() {
    const [total, newCount, replied] = await Promise.all([
      (this.prisma as any).contactMessage.count(),
      (this.prisma as any).contactMessage.count({ where: { status: 'NEW' } }),
      (this.prisma as any).contactMessage.count({ where: { status: 'REPLIED' } }),
    ]);
    return { total, new: newCount, replied };
  }
}
