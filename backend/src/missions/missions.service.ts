import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type TargetType = 'bonus_reports_approved' | 'balance_programs_added' | 'referrals_applied';

/**
 * MissionsService — desafios opcionais que usuários completam pra ganhar
 * dias Premium. Progresso é calculado sob demanda (recompute ao ler), não
 * mantido via triggers — simplifica sync + evita bugs de contagem stale.
 *
 * Trade-off: mais queries por request. Cacheável no futuro.
 */
@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(private prisma: PrismaService) {}

  private async computeProgress(
    userId: string,
    targetType: TargetType,
    validFrom: Date,
  ): Promise<number> {
    switch (targetType) {
      case 'bonus_reports_approved':
        return this.prisma.bonusReport.count({
          where: {
            reporterId: userId,
            status: 'APPROVED',
            createdAt: { gte: validFrom },
          },
        });
      case 'balance_programs_added':
        return this.prisma.userMilesBalance.count({
          where: { userId, balance: { gt: 0 } },
        });
      case 'referrals_applied':
        return this.prisma.user.count({
          where: {
            referredById: userId,
            createdAt: { gte: validFrom },
          } as any,
        });
      default:
        return 0;
    }
  }

  async listForUser(userId: string) {
    const now = new Date();
    const missions = await (this.prisma as any).mission.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { validFrom: 'desc' },
    });

    const userMissions: any[] = await (this.prisma as any).userMission.findMany({
      where: { userId, missionId: { in: missions.map((m: any) => m.id) } },
    });
    const umByMissionId = new Map(userMissions.map((um: any) => [um.missionId, um]));

    const out = await Promise.all(
      missions.map(async (m: any) => {
        const existing: any = umByMissionId.get(m.id);
        if (existing?.rewardClaimedAt) {
          return {
            ...m,
            progress: existing.progress,
            completedAt: existing.completedAt,
            rewardClaimedAt: existing.rewardClaimedAt,
            claimed: true,
          };
        }

        const progress = await this.computeProgress(userId, m.targetType as TargetType, m.validFrom);
        const completed = progress >= m.targetCount;
        return {
          ...m,
          progress,
          completedAt: completed ? existing?.completedAt || new Date() : null,
          rewardClaimedAt: null,
          claimed: false,
        };
      }),
    );

    return {
      count: out.length,
      missions: out,
    };
  }

  /**
   * Claim do reward. Verifica progresso REAL (não confia no frontend).
   * Upsert do UserMission + update do subscription expiresAt atomicamente.
   */
  async claimReward(userId: string, missionId: string) {
    const mission = await (this.prisma as any).mission.findUnique({
      where: { id: missionId },
    });
    if (!mission || !mission.isActive) {
      throw new Error('Missão não encontrada ou inativa');
    }

    const now = new Date();
    if (mission.validTo && mission.validTo < now) {
      throw new Error('Missão já expirou');
    }

    const progress = await this.computeProgress(
      userId,
      mission.targetType as TargetType,
      mission.validFrom,
    );
    if (progress < mission.targetCount) {
      throw new Error(
        `Progresso insuficiente: ${progress}/${mission.targetCount}`,
      );
    }

    const existing = await (this.prisma as any).userMission.findUnique({
      where: { userId_missionId: { userId, missionId } },
    });
    if (existing?.rewardClaimedAt) {
      throw new Error('Recompensa já foi resgatada');
    }

    // Transaction: upsert UserMission + estende Premium do user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User não encontrado');

    const currentExpiry =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? user.subscriptionExpiresAt
        : now;
    const newExpiry = new Date(currentExpiry.getTime() + mission.rewardDays * 86400_000);

    await this.prisma.$transaction([
      (this.prisma as any).userMission.upsert({
        where: { userId_missionId: { userId, missionId } },
        create: {
          userId,
          missionId,
          progress,
          completedAt: now,
          rewardClaimedAt: now,
        },
        update: {
          progress,
          completedAt: now,
          rewardClaimedAt: now,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan:
            user.subscriptionPlan === 'FREE' ? 'PREMIUM' : user.subscriptionPlan,
          subscriptionExpiresAt: newExpiry,
        },
      }),
    ]);

    this.logger.log(
      `Mission claimed: user=${userId} mission=${mission.slug} +${mission.rewardDays}d → ${newExpiry.toISOString()}`,
    );

    return {
      claimed: true,
      rewardDays: mission.rewardDays,
      newExpiresAt: newExpiry,
    };
  }
}
