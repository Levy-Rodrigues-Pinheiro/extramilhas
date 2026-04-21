import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ReporterTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface ReporterStats {
  userId: string;
  name: string;
  approvedCount: number;
  tier: ReporterTier;
  rank: number;
}

/**
 * Tier calculado pelo número de reports APROVADOS.
 * Escolhemos faixas conservadoras pra criar progressão visível:
 *   1-2  → BRONZE (primeiro report vale)
 *   3-9  → SILVER
 *   10-24 → GOLD
 *   25+  → PLATINUM (reserva pro top ~5% dos reporters)
 */
export function tierFor(approvedCount: number): ReporterTier {
  if (approvedCount >= 25) return 'PLATINUM';
  if (approvedCount >= 10) return 'GOLD';
  if (approvedCount >= 3) return 'SILVER';
  return 'BRONZE';
}

export function nextTierThreshold(tier: ReporterTier): number | null {
  switch (tier) {
    case 'BRONZE':
      return 3;
    case 'SILVER':
      return 10;
    case 'GOLD':
      return 25;
    case 'PLATINUM':
      return null;
  }
}

/**
 * Anonimiza nome pra exibição pública no ranking.
 * "João Silva" → "João S."  /  "Maria" → "Maria"  /  "" → "Anônimo"
 */
export function displayName(name: string | null | undefined): string {
  if (!name) return 'Anônimo';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Top N reporters. Por padrão all-time, mas aceita filtro de janela
   * temporal ('month' = do primeiro dia do mês atual até agora).
   * Barato: é um groupBy + join simples. Cacheável se crescer.
   */
  async topReporters(limit = 20, window: 'all' | 'month' = 'all') {
    const createdAtFilter =
      window === 'month'
        ? (() => {
            const now = new Date();
            return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
          })()
        : undefined;

    const grouped = await this.prisma.bonusReport.groupBy({
      by: ['reporterId'],
      where: {
        status: 'APPROVED',
        reporterId: { not: null },
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      _count: { _all: true },
      orderBy: { _count: { reporterId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const userIds = grouped.map((g) => g.reporterId!).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userById = new Map(users.map((u) => [u.id, u.name]));

    return grouped.map((g, i): ReporterStats => {
      const count = g._count._all;
      return {
        userId: g.reporterId!,
        name: displayName(userById.get(g.reporterId!)),
        approvedCount: count,
        tier: tierFor(count),
        rank: i + 1,
      };
    });
  }

  /**
   * Stats do user autenticado: contagem aprovada, tier, rank, próxima meta.
   */
  async myStats(userId: string) {
    const approvedCount = await this.prisma.bonusReport.count({
      where: { status: 'APPROVED', reporterId: userId },
    });

    const tier = tierFor(approvedCount);
    const nextThreshold = nextTierThreshold(tier);

    // Rank: quantos reporters têm MAIS aprovados. +1 = minha posição.
    // Se eu tenho 0 aprovados, não tenho rank (null).
    let rank: number | null = null;
    if (approvedCount > 0) {
      // subquery: contar reporterIds distintos com _count > approvedCount
      const higher = await this.prisma.bonusReport.groupBy({
        by: ['reporterId'],
        where: {
          status: 'APPROVED',
          reporterId: { not: null, notIn: [userId] },
        },
        _count: { _all: true },
        having: { reporterId: { _count: { gt: approvedCount } } },
      });
      rank = higher.length + 1;
    }

    return {
      approvedCount,
      tier,
      rank,
      nextTier: nextThreshold
        ? {
            needed: nextThreshold - approvedCount,
            threshold: nextThreshold,
            name: tierFor(nextThreshold),
          }
        : null,
    };
  }

  /**
   * Top referrers — users com mais indicações. Usa relação self-referencing
   * User.referrals (criada pelo ReferralModule).
   */
  async topReferrers(limit = 20) {
    const results = (await (this.prisma.user as any).findMany({
      where: { referrals: { some: {} } },
      include: {
        _count: { select: { referrals: true } },
      },
      take: limit * 3,
    })) as Array<any>;
    const sorted = results
      .map((u: any) => ({
        userId: u.id,
        name: u.name,
        publicUsername: u.publicUsername ?? null,
        referralsCount: u._count?.referrals ?? 0,
      }))
      .sort((a, b) => b.referralsCount - a.referralsCount)
      .slice(0, limit)
      .map((u, i) => ({ ...u, rank: i + 1 }));
    return sorted;
  }
}
