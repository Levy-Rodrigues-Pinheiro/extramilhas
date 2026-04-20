import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reviews de bônus de transferência.
 *
 * Um user vê a oferta no app, transfere, e depois volta pra dizer se
 * "funcionou" (saiu o bônus prometido, sem fricção). Isso gera score de
 * credibilidade: ofertas com muitos "funcionou" sobem no feed.
 */
@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upsert — 1 review por par (user, partnership). Se user mudar de ideia,
   * sobrescreve.
   */
  async upsert(userId: string, partnershipId: string, worked: boolean, comment?: string) {
    return (this.prisma as any).offerReview.upsert({
      where: { userId_partnershipId: { userId, partnershipId } },
      create: { userId, partnershipId, worked, comment },
      update: { worked, comment },
    });
  }

  async deleteReview(userId: string, partnershipId: string) {
    await (this.prisma as any).offerReview.deleteMany({
      where: { userId, partnershipId },
    });
    return { message: 'Review removido' };
  }

  /**
   * Retorna contagem agregada pra uma partnership (worked vs notWorked).
   * Caso o user passado tenha review própria, inclui no payload pra mobile
   * pintar o botão selecionado.
   */
  async getSummary(partnershipId: string, userId?: string) {
    const rows = await (this.prisma as any).offerReview.groupBy({
      by: ['worked'],
      where: { partnershipId },
      _count: { _all: true },
    });
    let worked = 0;
    let notWorked = 0;
    for (const r of rows) {
      if (r.worked) worked = r._count._all;
      else notWorked = r._count._all;
    }
    const total = worked + notWorked;
    const percentWorked = total > 0 ? Math.round((worked / total) * 100) : null;

    let myReview: { worked: boolean; comment: string | null } | null = null;
    if (userId) {
      const mine = await (this.prisma as any).offerReview.findUnique({
        where: { userId_partnershipId: { userId, partnershipId } },
      });
      if (mine) myReview = { worked: mine.worked, comment: mine.comment };
    }

    return { total, worked, notWorked, percentWorked, myReview };
  }
}
