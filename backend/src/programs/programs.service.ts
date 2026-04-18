import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return programs;
  }

  async findOne(id: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
      },
      include: {
        _count: {
          select: { offers: { where: { isActive: true, isDeleted: false } } },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async comparePrograms(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new NotFoundException('No program IDs provided');
    }

    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { id: { in: ids }, isActive: true },
      include: {
        _count: { select: { offers: { where: { isActive: true, isDeleted: false } } } },
      },
    });

    // Get latest price history for each program
    const priceHistories = await Promise.all(
      programs.map(async (program) => {
        const history = await this.prisma.priceHistory.findFirst({
          where: { programId: program.id },
          orderBy: { date: 'desc' },
        });
        return { programId: program.id, history };
      }),
    );

    return programs.map((program) => {
      const priceData = priceHistories.find((ph) => ph.programId === program.id);
      return {
        ...program,
        latestPriceHistory: priceData?.history || null,
      };
    });
  }

  async getPrediction(programId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { OR: [{ id: programId }, { slug: programId }] },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const history = await this.prisma.priceHistory.findMany({
      where: {
        programId: program.id,
        date: { gte: ninetyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    const currentCpm = Number(program.avgCpmCurrent);

    if (history.length < 2) {
      return {
        trend: 'STABLE',
        confidence: 0,
        predictedCpm7d: currentCpm,
        predictedCpm30d: currentCpm,
        currentCpm,
        ma7: currentCpm,
        ma30: currentCpm,
        recommendation: 'NEUTRO',
        reasoning: 'Dados insuficientes para previsão',
      };
    }

    // Linear regression
    const n = history.length;
    const values = history.map((h) => Number(h.avgCpm));
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // MA7 and MA30
    const last7 = values.slice(-7);
    const last30 = values.slice(-30);
    const ma7 = last7.reduce((a, b) => a + b, 0) / last7.length;
    const ma30 = last30.reduce((a, b) => a + b, 0) / last30.length;

    // Volatility (standard deviation of daily % changes)
    const pctChanges: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        pctChanges.push(((values[i] - values[i - 1]) / values[i - 1]) * 100);
      }
    }
    const avgChange = pctChanges.length > 0 ? pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length : 0;
    const volatility = pctChanges.length > 0
      ? Math.sqrt(pctChanges.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / pctChanges.length)
      : 0;

    // Predictions
    const predictedCpm7d = parseFloat((intercept + slope * (n + 7)).toFixed(2));
    const predictedCpm30d = parseFloat((intercept + slope * (n + 30)).toFixed(2));

    // Trend and recommendation
    const slopePercent = currentCpm > 0 ? (slope / currentCpm) * 100 : 0;
    let trend: string;
    let recommendation: string;
    let reasoning: string;

    if (slopePercent < -0.5) {
      trend = 'DOWN';
      recommendation = 'COMPRAR';
      reasoning = 'Tendência de queda no CPM — bom momento para comprar milhas';
    } else if (slopePercent > 0.5) {
      trend = 'UP';
      recommendation = 'ESPERAR';
      reasoning = 'Tendência de alta no CPM — considere aguardar melhor oportunidade';
    } else {
      trend = 'STABLE';
      recommendation = 'NEUTRO';
      reasoning = 'CPM estável — avalie conforme sua necessidade';
    }

    const confidence = Math.max(0, Math.min(100, parseFloat((100 - volatility * 3).toFixed(1))));

    return {
      trend,
      confidence,
      predictedCpm7d,
      predictedCpm30d,
      currentCpm,
      ma7: parseFloat(ma7.toFixed(2)),
      ma30: parseFloat(ma30.toFixed(2)),
      recommendation,
      reasoning,
    };
  }

  async getPriceHistory(programId: string, range: string = '30d') {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { OR: [{ id: programId }, { slug: programId }] },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const history = await this.prisma.priceHistory.findMany({
      where: {
        programId: program.id,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const stats = history.length > 0 ? {
      min: Math.min(...history.map((h) => Number(h.minCpm))),
      max: Math.max(...history.map((h) => Number(h.avgCpm))),
      avg: history.reduce((sum, h) => sum + Number(h.avgCpm), 0) / history.length,
      current: Number(program.avgCpmCurrent),
    } : null;

    return { program, history, stats };
  }
}
