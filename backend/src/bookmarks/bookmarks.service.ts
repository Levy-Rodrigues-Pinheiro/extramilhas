import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, kind?: string) {
    return (this.prisma as any).bookmark.findMany({
      where: { userId, ...(kind ? { kind: kind.toUpperCase() } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggle(userId: string, kind: string, targetId: string, label: string, note?: string) {
    const validKinds = ['PROGRAM', 'DESTINATION', 'BONUS', 'GUIDE', 'OFFER'];
    const kindUp = kind.toUpperCase();
    if (!validKinds.includes(kindUp)) {
      throw new ForbiddenException(`kind deve ser um de: ${validKinds.join(', ')}`);
    }
    const existing = await (this.prisma as any).bookmark.findUnique({
      where: { userId_kind_targetId: { userId, kind: kindUp, targetId } },
    });
    if (existing) {
      await (this.prisma as any).bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await (this.prisma as any).bookmark.create({
      data: {
        userId,
        kind: kindUp,
        targetId,
        label: label.slice(0, 200),
        note: note?.slice(0, 500),
      },
    });
    return { bookmarked: true };
  }

  async isBookmarked(userId: string, kind: string, targetId: string): Promise<boolean> {
    const b = await (this.prisma as any).bookmark.findUnique({
      where: { userId_kind_targetId: { userId, kind: kind.toUpperCase(), targetId } },
    });
    return !!b;
  }
}
