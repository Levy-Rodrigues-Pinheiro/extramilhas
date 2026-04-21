import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, includeArchived = false) {
    return (this.prisma as any).userNote.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async create(
    userId: string,
    params: { title: string; body: string; tag?: string; remindAt?: string },
  ) {
    if (!params.title?.trim() || !params.body?.trim()) {
      throw new ForbiddenException('Título e corpo obrigatórios');
    }
    return (this.prisma as any).userNote.create({
      data: {
        userId,
        title: params.title.slice(0, 200),
        body: params.body.slice(0, 5000),
        tag: params.tag || 'GERAL',
        remindAt: params.remindAt ? new Date(params.remindAt) : null,
      },
    });
  }

  async update(
    userId: string,
    noteId: string,
    params: {
      title?: string;
      body?: string;
      tag?: string;
      remindAt?: string | null;
      isPinned?: boolean;
      isArchived?: boolean;
    },
  ) {
    const note = await (this.prisma as any).userNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Nota não encontrada');
    if (note.userId !== userId) throw new ForbiddenException('Sem permissão');
    return (this.prisma as any).userNote.update({
      where: { id: noteId },
      data: {
        ...(params.title !== undefined && { title: params.title.slice(0, 200) }),
        ...(params.body !== undefined && { body: params.body.slice(0, 5000) }),
        ...(params.tag !== undefined && { tag: params.tag }),
        ...(params.remindAt !== undefined && {
          remindAt: params.remindAt ? new Date(params.remindAt) : null,
          remindSent: false, // reseta flag ao mudar data
        }),
        ...(params.isPinned !== undefined && { isPinned: params.isPinned }),
        ...(params.isArchived !== undefined && { isArchived: params.isArchived }),
      },
    });
  }

  async delete(userId: string, noteId: string) {
    const note = await (this.prisma as any).userNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Nota não encontrada');
    if (note.userId !== userId) throw new ForbiddenException('Sem permissão');
    await (this.prisma as any).userNote.delete({ where: { id: noteId } });
    return { deleted: true };
  }
}
