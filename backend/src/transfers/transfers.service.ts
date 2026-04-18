import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async getPartnerships() {
    return this.prisma.transferPartnership.findMany({
      where: { isActive: true },
      include: {
        fromProgram: { select: { id: true, name: true, slug: true, logoUrl: true, avgCpmCurrent: true } },
        toProgram: { select: { id: true, name: true, slug: true, logoUrl: true, avgCpmCurrent: true } },
      },
      orderBy: { currentBonus: 'desc' },
    });
  }

  async calculate(fromProgramId: string, toProgramId: string, points: number) {
    const partnership = await this.prisma.transferPartnership.findFirst({
      where: { fromProgramId, toProgramId, isActive: true },
      include: { fromProgram: true, toProgram: true },
    });
    if (!partnership) throw new NotFoundException('Parceria de transferência não encontrada');

    const resultMiles = Math.floor(points * partnership.baseRate * (1 + partnership.currentBonus / 100));
    const toCpm = Number(partnership.toProgram.avgCpmCurrent);
    const effectiveCpm = points > 0 ? parseFloat(((toCpm * points) / resultMiles).toFixed(2)) : 0;

    return {
      fromProgram: partnership.fromProgram,
      toProgram: partnership.toProgram,
      inputPoints: points,
      resultMiles,
      bonusPercent: partnership.currentBonus,
      effectiveCpm,
    };
  }
}
