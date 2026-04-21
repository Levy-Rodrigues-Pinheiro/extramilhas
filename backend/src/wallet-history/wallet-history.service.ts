import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Histórico de carteira + heatmap de expiração.
 *
 * Snapshot: 1 por user por dia (unique). Cron pode rodar horário — upsert
 * garante idempotência.
 *
 * Heatmap de expiração: agrega quantos pontos expiram por mês nos próximos
 * 24 meses. Data é o user vê visualmente onde tem "cliff" de vencimento.
 */
@Injectable()
export class WalletHistoryService {
  private readonly logger = new Logger(WalletHistoryService.name);
  constructor(private prisma: PrismaService) {}

  async captureSnapshot(userId: string) {
    const balances = await this.prisma.userMilesBalance.findMany({
      where: { userId },
      include: { program: true },
    });
    const totalMiles = balances.reduce((s, b) => s + b.balance, 0);
    const totalValueBrl = balances.reduce(
      (s, b) => s + (b.balance / 1000) * (b.program.avgCpmCurrent || 25),
      0,
    );
    const breakdown = balances.map((b) => ({
      slug: b.program.slug,
      balance: b.balance,
      valueBrl: (b.balance / 1000) * (b.program.avgCpmCurrent || 25),
    }));

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return (this.prisma as any).walletSnapshot.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        totalMiles,
        totalValueBrl,
        programsCount: balances.length,
        breakdown: JSON.stringify(breakdown),
      },
      update: {
        totalMiles,
        totalValueBrl,
        programsCount: balances.length,
        breakdown: JSON.stringify(breakdown),
      },
    });
  }

  async getHistory(userId: string, days = 90) {
    const since = new Date(Date.now() - days * 86400_000);
    since.setUTCHours(0, 0, 0, 0);
    const snapshots = await (this.prisma as any).walletSnapshot.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
    return snapshots.map((s: any) => ({
      date: s.date,
      totalMiles: s.totalMiles,
      totalValueBrl: s.totalValueBrl,
      programsCount: s.programsCount,
      breakdown: (() => {
        try {
          return JSON.parse(s.breakdown);
        } catch {
          return [];
        }
      })(),
    }));
  }

  /**
   * Heatmap de expiração pros próximos 24 meses. Agrega balances do user
   * agrupados por month-year. Retorna array [{month: "2026-05", miles: 30000, valueBrl: 750}]
   */
  async getExpirationHeatmap(userId: string) {
    const balances = await this.prisma.userMilesBalance.findMany({
      where: { userId, balance: { gt: 0 }, expiresAt: { not: null } },
      include: { program: true },
    });

    const now = new Date();
    const buckets: Record<string, { miles: number; valueBrl: number; programs: string[] }> = {};

    // Pré-popula 24 meses vazios
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { miles: 0, valueBrl: 0, programs: [] };
    }

    for (const b of balances) {
      if (!b.expiresAt) continue;
      const ex = new Date(b.expiresAt);
      const key = `${ex.getFullYear()}-${String(ex.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) continue; // fora da janela de 24m
      buckets[key].miles += b.balance;
      buckets[key].valueBrl += (b.balance / 1000) * (b.program.avgCpmCurrent || 25);
      if (!buckets[key].programs.includes(b.program.slug)) {
        buckets[key].programs.push(b.program.slug);
      }
    }

    const data = Object.entries(buckets)
      .map(([month, v]) => ({
        month,
        miles: v.miles,
        valueBrl: Math.round(v.valueBrl * 100) / 100,
        programs: v.programs,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const maxMiles = Math.max(...data.map((d) => d.miles));
    const totalMilesExpiring = data.reduce((s, d) => s + d.miles, 0);
    const totalValueExpiring = data.reduce((s, d) => s + d.valueBrl, 0);

    return {
      data: data.map((d) => ({
        ...d,
        intensity: maxMiles > 0 ? Math.round((d.miles / maxMiles) * 100) : 0,
      })),
      summary: {
        totalMilesExpiring,
        totalValueExpiringBrl: Math.round(totalValueExpiring * 100) / 100,
        maxMonthMiles: maxMiles,
      },
    };
  }

  /**
   * Batch job — snapshot pra todos users com device ativo nos últimos 7d.
   * Chamado por cron 1x/dia 4h UTC.
   */
  async captureForActiveUsers(): Promise<{ processed: number; skipped: number }> {
    const since = new Date(Date.now() - 7 * 86400_000);
    const activeUsers = await this.prisma.user.findMany({
      where: {
        deviceTokens: {
          some: { lastUsedAt: { gte: since } },
        },
      },
      select: { id: true },
      take: 5000, // cap pra segurança
    });

    let processed = 0;
    let skipped = 0;
    for (const u of activeUsers) {
      try {
        await this.captureSnapshot(u.id);
        processed++;
      } catch (err) {
        skipped++;
        this.logger.warn(`Snapshot failed for user ${u.id}: ${(err as Error).message}`);
      }
    }
    return { processed, skipped };
  }
}
