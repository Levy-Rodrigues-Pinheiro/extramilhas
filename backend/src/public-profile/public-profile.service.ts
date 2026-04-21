import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicProfileService {
  constructor(private prisma: PrismaService) {}

  private validateUsername(username: string): string {
    const clean = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      throw new BadRequestException(
        'Username: 3-30 chars, só a-z 0-9 e _. Sem espaços/acentos.',
      );
    }
    // Reservados
    const reserved = ['admin', 'support', 'api', 'root', 'me', 'user', 'users', 'milhasextras'];
    if (reserved.includes(clean)) throw new BadRequestException('Username reservado');
    return clean;
  }

  async setUsername(userId: string, username: string) {
    const clean = this.validateUsername(username);
    const existing = await (this.prisma.user as any).findFirst({
      where: { publicUsername: clean, id: { not: userId } },
    });
    if (existing) throw new ForbiddenException('Username já tomado');
    return (this.prisma.user as any).update({
      where: { id: userId },
      data: { publicUsername: clean },
    });
  }

  async updateProfile(
    userId: string,
    params: {
      bio?: string;
      avatarUrl?: string;
      showLeaderboard?: boolean;
      showGuides?: boolean;
    },
  ) {
    return (this.prisma.user as any).update({
      where: { id: userId },
      data: {
        ...(params.bio !== undefined && { publicBio: params.bio.slice(0, 500) }),
        ...(params.avatarUrl !== undefined && { publicAvatarUrl: params.avatarUrl }),
        ...(params.showLeaderboard !== undefined && {
          publicShowLeaderboard: params.showLeaderboard,
        }),
        ...(params.showGuides !== undefined && { publicShowGuides: params.showGuides }),
      },
    });
  }

  async getByUsername(username: string) {
    const clean = username.toLowerCase();
    const user: any = await (this.prisma.user as any).findFirst({
      where: { publicUsername: clean },
      select: {
        id: true,
        publicUsername: true,
        publicBio: true,
        publicAvatarUrl: true,
        publicShowLeaderboard: true,
        publicShowGuides: true,
        createdAt: true,
        name: true,
      },
    });
    if (!user) throw new NotFoundException('Perfil não encontrado');

    // Load optional sections baseado em flags
    const sections: any = {};

    if (user.publicShowLeaderboard) {
      const reportsApproved = await this.prisma.bonusReport.count({
        where: { reporterId: user.id, status: 'APPROVED' },
      });
      sections.leaderboard = { reportsApproved };
    }

    if (user.publicShowGuides) {
      const guides = await (this.prisma as any).userGuide.findMany({
        where: { authorId: user.id, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 10,
        select: {
          slug: true,
          title: true,
          summary: true,
          upvoteCount: true,
          viewCount: true,
          publishedAt: true,
        },
      });
      sections.guides = guides;
    }

    return {
      username: user.publicUsername,
      displayName: user.name,
      bio: user.publicBio,
      avatarUrl: user.publicAvatarUrl,
      memberSince: user.createdAt,
      sections,
    };
  }
}
