import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Milestones de streak e quantos dias de Premium rendem. Admin pode mudar
 * via migration futura; mantemos hardcoded pra não complicar.
 */
const STREAK_REWARDS: Array<{ days: number; premiumDaysGranted: number }> = [
  { days: 7, premiumDaysGranted: 1 },
  { days: 30, premiumDaysGranted: 7 },
  { days: 100, premiumDaysGranted: 30 },
  { days: 365, premiumDaysGranted: 90 },
];

/**
 * Engagement: streaks diários + goals de milhas.
 *
 * Streak:
 *   - Cada "ping" (mobile chama /engagement/streak/ping quando app abre)
 *     incrementa o contador se foi OUTRO dia desde o último ping. Mesmo
 *     dia = no-op.
 *   - Quebra: se gap > 1 dia, reseta pra 1 (a menos que user use freeze).
 *   - Milestones: 7d / 30d / 100d → dispara missão claimable no mission engine.
 *
 * Goals:
 *   - Snapshot do saldo atual no startingMiles quando cria.
 *   - Progresso = (saldo atual - startingMiles). Se programId, filtra por
 *     programa; senão soma todos.
 *   - Auto-completion: quando progresso >= targetMiles, marca completedAt.
 */
@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica se user atingiu milestone novo no streak e grata Premium.
   * Idempotente: usa milestonesClaimed (JSON array de días-atingidos) pra
   * não pagar 2x. Retorna null se nenhuma milestone nova.
   */
  private async checkAndClaimMilestones(
    userId: string,
    currentStreak: number,
    existingClaimed: string,
  ): Promise<{ daysReached: number; premiumDaysGranted: number; newExpiresAt: Date } | null> {
    let claimed: number[] = [];
    try {
      claimed = JSON.parse(existingClaimed) as number[];
      if (!Array.isArray(claimed)) claimed = [];
    } catch {
      claimed = [];
    }

    // Encontra milestone maior ainda não reivindicado
    const eligible = STREAK_REWARDS
      .filter((r) => currentStreak >= r.days && !claimed.includes(r.days))
      .sort((a, b) => b.days - a.days)[0];

    if (!eligible) return null;

    // Grata Premium: extende subscriptionExpiresAt se já é Premium, ou ativa trial-like
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const now = new Date();
    const basis =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? user.subscriptionExpiresAt
        : now;
    const newExpiresAt = new Date(basis.getTime() + eligible.premiumDaysGranted * 86400_000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: user.subscriptionPlan === 'FREE' ? 'PREMIUM' : user.subscriptionPlan,
        subscriptionExpiresAt: newExpiresAt,
      },
    });

    const updatedClaimed = [...claimed, eligible.days];
    await (this.prisma as any).userStreak.update({
      where: { userId },
      data: { milestonesClaimed: JSON.stringify(updatedClaimed) },
    });

    // Registra notificação pra o user ver
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          title: `🏆 Streak de ${eligible.days}d conquistado!`,
          body: `Você ganhou ${eligible.premiumDaysGranted} dia${eligible.premiumDaysGranted > 1 ? 's' : ''} de Premium grátis. Continue firme!`,
          type: 'streak_reward',
          data: JSON.stringify({
            daysReached: eligible.days,
            premiumDaysGranted: eligible.premiumDaysGranted,
          }),
        },
      });
    } catch (err) {
      this.logger.warn(`Notification creation failed: ${(err as Error).message}`);
    }

    return {
      daysReached: eligible.days,
      premiumDaysGranted: eligible.premiumDaysGranted,
      newExpiresAt,
    };
  }

  // ─── Streaks ────────────────────────────────────────────────────────

  async getStreak(userId: string) {
    const streak = await (this.prisma as any).userStreak.findUnique({
      where: { userId },
    });
    return streak ?? { currentStreak: 0, longestStreak: 0, freezesAvailable: 1 };
  }

  async ping(userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const existing = await (this.prisma as any).userStreak.findUnique({
      where: { userId },
    });

    if (!existing) {
      // Primeiro ping
      const created = await (this.prisma as any).userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
          freezesAvailable: 1,
        },
      });
      return { ...created, isNewDay: true, streakBroken: false };
    }

    const lastDay = new Date(
      existing.lastActiveDate.getFullYear(),
      existing.lastActiveDate.getMonth(),
      existing.lastActiveDate.getDate(),
    );
    const dayDiff = Math.round((today.getTime() - lastDay.getTime()) / 86400_000);

    if (dayDiff === 0) {
      // Mesmo dia: no-op
      return { ...existing, isNewDay: false, streakBroken: false };
    }

    if (dayDiff === 1) {
      // Dia seguinte: +1
      const next = existing.currentStreak + 1;
      const updated = await (this.prisma as any).userStreak.update({
        where: { userId },
        data: {
          currentStreak: next,
          longestStreak: Math.max(existing.longestStreak, next),
          lastActiveDate: today,
        },
      });
      // Verifica milestone (apenas se avançou, não em mesmo-dia)
      const reward = await this.checkAndClaimMilestones(
        userId,
        next,
        existing.milestonesClaimed ?? '[]',
      );
      return { ...updated, isNewDay: true, streakBroken: false, reward };
    }

    // Gap de 2+ dias: se tem freeze disponível, gasta 1 e preserva
    if (dayDiff === 2 && existing.freezesAvailable > 0) {
      const next = existing.currentStreak + 1;
      const updated = await (this.prisma as any).userStreak.update({
        where: { userId },
        data: {
          currentStreak: next,
          longestStreak: Math.max(existing.longestStreak, next),
          lastActiveDate: today,
          freezesAvailable: existing.freezesAvailable - 1,
        },
      });
      const reward = await this.checkAndClaimMilestones(
        userId,
        next,
        existing.milestonesClaimed ?? '[]',
      );
      return { ...updated, isNewDay: true, streakBroken: false, freezeUsed: true, reward };
    }

    // Quebra
    const updated = await (this.prisma as any).userStreak.update({
      where: { userId },
      data: {
        currentStreak: 1,
        lastActiveDate: today,
      },
    });
    return { ...updated, isNewDay: true, streakBroken: true };
  }

  // ─── Goals ──────────────────────────────────────────────────────────

  private async currentMilesForGoal(userId: string, programId?: string): Promise<number> {
    const where: any = { userId };
    if (programId) where.programId = programId;
    const rows = await this.prisma.userMilesBalance.findMany({
      where,
      select: { balance: true },
    });
    return rows.reduce((s, r) => s + r.balance, 0);
  }

  async createGoal(
    userId: string,
    params: { title: string; programId?: string; targetMiles: number; targetDate: string },
  ) {
    const starting = await this.currentMilesForGoal(userId, params.programId);
    return (this.prisma as any).userGoal.create({
      data: {
        userId,
        title: params.title,
        programId: params.programId ?? null,
        targetMiles: params.targetMiles,
        targetDate: new Date(params.targetDate),
        startingMiles: starting,
      },
    });
  }

  async listGoals(userId: string, includeArchived = false) {
    const goals = await (this.prisma as any).userGoal.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: { targetDate: 'asc' },
    });
    const enriched = await Promise.all(
      goals.map(async (g: any) => {
        const current = await this.currentMilesForGoal(userId, g.programId || undefined);
        const progress = current - g.startingMiles;
        const percent = g.targetMiles > 0 ? Math.min(100, (progress / g.targetMiles) * 100) : 0;
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400_000),
        );
        const dailyNeeded = daysLeft > 0 ? Math.max(0, (g.targetMiles - progress) / daysLeft) : 0;

        // Auto-complete se atingiu e não tá arquivado
        if (progress >= g.targetMiles && !g.completedAt) {
          await (this.prisma as any).userGoal.update({
            where: { id: g.id },
            data: { completedAt: new Date() },
          });
          g.completedAt = new Date();
        }

        return {
          ...g,
          currentMiles: current,
          progressMiles: progress,
          percent: Math.round(percent * 10) / 10,
          daysLeft,
          dailyMilesNeeded: Math.round(dailyNeeded),
        };
      }),
    );
    return enriched;
  }

  async archiveGoal(userId: string, goalId: string) {
    const goal = await (this.prisma as any).userGoal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal não encontrado');
    await (this.prisma as any).userGoal.update({
      where: { id: goalId },
      data: { isArchived: true },
    });
    return { archived: true };
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await (this.prisma as any).userGoal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) throw new NotFoundException('Goal não encontrado');
    await (this.prisma as any).userGoal.delete({ where: { id: goalId } });
    return { deleted: true };
  }
}
