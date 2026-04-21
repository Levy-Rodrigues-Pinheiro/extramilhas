import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Activity feed service. Outros services (engagement, guides, quizzes, family)
 * chamam .record() pra postar events. Feed público respeita shareActivity
 * de UserPreference — se false, só privacy (user vê mas outros não).
 *
 * Activity TTL: 90 dias. Cron limpa (adiciona futuro).
 */
@Injectable()
export class ActivityFeedService {
  constructor(private prisma: PrismaService) {}

  async record(
    userId: string,
    kind: string,
    summary: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Respeita opt-out — se shareActivity=false, marca PRIVATE
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });
    const visibility = (pref as any)?.shareActivity === true ? 'PUBLIC' : 'PRIVATE';
    try {
      await (this.prisma as any).activity.create({
        data: {
          userId,
          kind,
          summary: summary.slice(0, 500),
          metadata: metadata ? JSON.stringify(metadata) : null,
          visibility,
        },
      });
    } catch {
      /* activity feed nunca deve quebrar fluxo principal */
    }
  }

  /**
   * Feed público global — últimas N activities de usuários que optaram IN.
   */
  async getPublicFeed(limit = 50) {
    const cap = Math.min(limit, 100);
    const activities = await (this.prisma as any).activity.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: cap,
    });

    // Enrich com user pra display
    const userIds: string[] = Array.from(new Set(activities.map((a: any) => a.userId as string)));
    const users = (await (this.prisma.user as any).findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, publicUsername: true, publicAvatarUrl: true, badges: true },
    })) as Array<{
      id: string;
      name: string;
      publicUsername: string | null;
      publicAvatarUrl: string | null;
      badges: string;
    }>;
    const userMap = new Map(users.map((u) => [u.id, u]));

    return activities.map((a: any) => {
      const u = userMap.get(a.userId);
      let badges: string[] = [];
      try {
        badges = u ? JSON.parse(u.badges) : [];
      } catch {
        /* ignore */
      }
      return {
        id: a.id,
        kind: a.kind,
        summary: a.summary,
        createdAt: a.createdAt,
        metadata: (() => {
          try {
            return a.metadata ? JSON.parse(a.metadata) : null;
          } catch {
            return null;
          }
        })(),
        user: u
          ? {
              name: u.name,
              publicUsername: u.publicUsername,
              publicAvatarUrl: u.publicAvatarUrl,
              badges,
            }
          : null,
      };
    });
  }

  async getMyFeed(userId: string, limit = 50) {
    const cap = Math.min(limit, 100);
    return (this.prisma as any).activity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: cap,
    });
  }

  async setBadges(adminId: string, targetUserId: string, badges: string[]) {
    const valid = ['VERIFIED', 'CREATOR', 'STAFF', 'EARLY_ADOPTER', 'TOP_REPORTER'];
    const clean = badges.filter((b) => valid.includes(b));
    await (this.prisma.user as any).update({
      where: { id: targetUserId },
      data: { badges: JSON.stringify(clean) },
    });
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'SET_BADGES',
        entityType: 'user',
        entityId: targetUserId,
        after: JSON.stringify({ badges: clean }),
      },
    });
    return { badges: clean };
  }
}
