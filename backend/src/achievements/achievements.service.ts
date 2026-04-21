import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Achievements engine.
 *
 * Separação:
 *   - Catalog estático: admin cria via seed ou migration
 *   - UserAchievement: desbloqueio idempotente via unlock(userId, slug)
 *   - Rules: métodos dedicated (unlockFirstBalance, unlockStreak7, etc)
 *     chamados pelos services relevantes (wallet/engagement/guides)
 *
 * Pra não acoplar, rules podem ser chamadas opcionalmente — app funciona
 * mesmo sem trigger. Futuro: switch pra event-driven (EventEmitter).
 */
@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);
  constructor(private prisma: PrismaService) {}

  async listCatalog() {
    return (this.prisma as any).achievement.findMany({
      where: { isHidden: false },
      orderBy: [{ rarity: 'asc' }, { slug: 'asc' }],
    });
  }

  async myUnlocked(userId: string) {
    const rows = await (this.prisma as any).userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
    return rows.map((r: any) => ({
      ...r.achievement,
      unlockedAt: r.unlockedAt,
      progressSnapshot: r.progressSnapshot,
    }));
  }

  /**
   * Retorna catalog completo + estado de unlock pro user.
   * Útil pra "wall of achievements" no profile.
   */
  async myCatalogWithStatus(userId: string) {
    const [catalog, unlocked] = await Promise.all([
      (this.prisma as any).achievement.findMany({ orderBy: { rarity: 'asc' } }),
      (this.prisma as any).userAchievement.findMany({ where: { userId } }),
    ]);
    const unlockedMap = new Map(unlocked.map((u: any) => [u.achievementId, u.unlockedAt]));
    return catalog
      .filter((a: any) => !a.isHidden || unlockedMap.has(a.id))
      .map((a: any) => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) ?? null,
      }));
  }

  /**
   * Unlock idempotente. Se já está unlocked, retorna existing. Cria Notification
   * na primeira vez.
   */
  async unlockBySlug(
    userId: string,
    slug: string,
    progressSnapshot?: string,
  ): Promise<{ unlocked: boolean; achievement?: any }> {
    const ach = await (this.prisma as any).achievement.findUnique({ where: { slug } });
    if (!ach) {
      this.logger.warn(`Achievement slug "${slug}" não existe no catalog`);
      return { unlocked: false };
    }
    const existing = await (this.prisma as any).userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: ach.id } },
    });
    if (existing) {
      return { unlocked: false, achievement: ach };
    }
    await (this.prisma as any).userAchievement.create({
      data: {
        userId,
        achievementId: ach.id,
        progressSnapshot: progressSnapshot ?? null,
      },
    });
    // Notif one-shot
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          title: `${ach.icon} ${ach.name}`,
          body: ach.description,
          type: 'achievement_unlocked',
          data: JSON.stringify({ slug: ach.slug }),
        },
      });
    } catch {
      /* ignore */
    }
    return { unlocked: true, achievement: ach };
  }

  // ─── Rules (chamáveis de outros services) ──────────────────────────

  async checkWalletRules(userId: string) {
    const balances = await this.prisma.userMilesBalance.findMany({
      where: { userId, balance: { gt: 0 } },
    });
    if (balances.length >= 1) {
      await this.unlockBySlug(userId, 'first-balance');
    }
    if (balances.length >= 5) {
      await this.unlockBySlug(userId, '5-programs');
    }
  }

  async checkStreakRules(userId: string, currentStreak: number) {
    if (currentStreak >= 7) await this.unlockBySlug(userId, 'streak-7');
    if (currentStreak >= 30) await this.unlockBySlug(userId, 'streak-30');
    if (currentStreak >= 100) await this.unlockBySlug(userId, 'streak-100');
  }

  async checkFamilyRules(userId: string) {
    const count = await this.prisma.familyMember.count({ where: { userId } });
    if (count >= 3) await this.unlockBySlug(userId, 'family-3');
  }

  async checkReporterRules(userId: string) {
    const count = await this.prisma.bonusReport.count({
      where: { reporterId: userId, status: 'APPROVED' },
    });
    if (count >= 100) await this.unlockBySlug(userId, '100-reports');
  }
}
