import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpsertMilesBalanceDto } from './dto/upsert-miles-balance.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Troca senha — valida a atual antes. Invalida refresh tokens
   * pra forçar re-login em outros devices (security win).
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User não encontrado');
    if (!user.passwordHash) {
      throw new UnauthorizedException('Conta social não tem senha pra trocar');
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Senha atual incorreta');

    const newHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, refreshToken: null },
    });
    return { changed: true };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
    });

    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  async getPreferences(userId: string) {
    let prefs = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.userPreference.create({
        data: {
          userId,
          preferredPrograms: '[]',
          preferredOrigins: '[]',
          preferredDestinations: '[]',
        },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });

    if (!existing) {
      return this.prisma.userPreference.create({
        data: {
          userId,
          preferredPrograms: JSON.stringify(dto.preferredPrograms || []),
          preferredOrigins: JSON.stringify(dto.preferredOrigins || []),
          preferredDestinations: JSON.stringify(dto.preferredDestinations || []),
          targetCpm: dto.targetCpm,
        },
      });
    }

    return this.prisma.userPreference.update({
      where: { userId },
      data: {
        ...(dto.preferredPrograms !== undefined && { preferredPrograms: JSON.stringify(dto.preferredPrograms) }),
        ...(dto.preferredOrigins !== undefined && { preferredOrigins: JSON.stringify(dto.preferredOrigins) }),
        ...(dto.preferredDestinations !== undefined && { preferredDestinations: JSON.stringify(dto.preferredDestinations) }),
        ...(dto.targetCpm !== undefined && { targetCpm: dto.targetCpm }),
      },
    });
  }

  async getMilesBalance(userId: string) {
    const balances = await this.prisma.userMilesBalance.findMany({
      where: { userId },
      include: { program: true },
      orderBy: { program: { name: 'asc' } },
    });

    return balances;
  }

  /**
   * Retorna a "carteira" do usuário com valor monetário total estimado,
   * lista enriquecida (saldo × CPM = R$), e flags de expiração.
   * É o endpoint principal pra tela de Carteira no mobile.
   */
  async getWalletSummary(userId: string) {
    const balances = await this.prisma.userMilesBalance.findMany({
      where: { userId },
      include: { program: true },
      orderBy: { balance: 'desc' },
    });

    const now = new Date();
    const items = balances.map((b) => {
      const cpm = Number(b.program.avgCpmCurrent);
      const valueBrl = parseFloat(((b.balance / 1000) * cpm).toFixed(2));
      const daysToExpiry = b.expiresAt
        ? Math.max(0, Math.ceil((b.expiresAt.getTime() - now.getTime()) / 86_400_000))
        : null;
      const isExpiringSoon = daysToExpiry != null && daysToExpiry <= 30;
      return {
        id: b.id,
        programId: b.programId,
        program: {
          id: b.program.id,
          slug: b.program.slug,
          name: b.program.name,
          logoUrl: b.program.logoUrl,
          avgCpm: cpm,
        },
        balance: b.balance,
        valueBrl,
        expiresAt: b.expiresAt?.toISOString() ?? null,
        daysToExpiry,
        isExpiringSoon,
        updatedAt: b.updatedAt.toISOString(),
      };
    });

    const totalBalance = items.reduce((s, i) => s + i.balance, 0);
    const totalValueBrl = parseFloat(items.reduce((s, i) => s + i.valueBrl, 0).toFixed(2));
    const expiringCount = items.filter((i) => i.isExpiringSoon).length;
    const programsCount = items.length;

    return {
      summary: {
        programsCount,
        totalBalance,
        totalValueBrl,
        expiringCount,
      },
      items,
    };
  }

  async deleteMilesBalance(userId: string, programId: string) {
    const result = await this.prisma.userMilesBalance.deleteMany({
      where: { userId, programId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Balance not found');
    }
    return { deleted: true };
  }

  async upsertMilesBalance(userId: string, dto: UpsertMilesBalanceDto) {
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { id: dto.programId },
    });

    if (!program) {
      throw new NotFoundException('Loyalty program not found');
    }

    return this.prisma.userMilesBalance.upsert({
      where: { userId_programId: { userId, programId: dto.programId } },
      create: { userId, programId: dto.programId, balance: dto.balance },
      update: { balance: dto.balance },
      include: { program: true },
    });
  }

  async getNotifications(userId: string, page: number, limit: number) {
    const skip = getPaginationSkip(page, limit);

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return createPaginatedResult(notifications, total, page, limit);
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read' };
  }

  async getUnreadNotificationsCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async getFamilyMembers(userId: string) {
    const members = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        balances: {
          include: { program: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calcula valor R$ por membro + total da família
    const membersWithValue = members.map((m) => {
      const totalPoints = m.balances.reduce((acc, b) => acc + b.balance, 0);
      const totalValueBrl = m.balances.reduce(
        (acc, b) =>
          acc + (b.balance / 1000) * Number(b.program.avgCpmCurrent),
        0,
      );
      return {
        ...m,
        summary: {
          totalPoints,
          totalValueBrl: parseFloat(totalValueBrl.toFixed(2)),
          programsCount: m.balances.length,
        },
      };
    });

    const familyTotal = membersWithValue.reduce(
      (acc, m) => acc + m.summary.totalValueBrl,
      0,
    );
    const familyPoints = membersWithValue.reduce(
      (acc, m) => acc + m.summary.totalPoints,
      0,
    );

    return {
      count: members.length,
      members: membersWithValue,
      summary: {
        totalValueBrl: parseFloat(familyTotal.toFixed(2)),
        totalPoints: familyPoints,
        membersCount: members.length,
      },
    };
  }

  async addFamilyMember(userId: string, name: string, relationship: string) {
    return this.prisma.familyMember.create({
      data: { userId, name, relationship },
    });
  }

  async deleteFamilyMember(userId: string, memberId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, userId },
    });
    if (!member) {
      throw new NotFoundException('Family member not found');
    }
    await this.prisma.familyMember.delete({ where: { id: memberId } });
    return { message: 'Family member removed' };
  }

  async updateFamilyMemberBalance(userId: string, memberId: string, programId: string, balance: number, expiresAt?: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, userId },
    });
    if (!member) {
      throw new NotFoundException('Family member not found');
    }
    return this.prisma.familyMemberBalance.upsert({
      where: { familyMemberId_programId: { familyMemberId: memberId, programId } },
      create: {
        familyMemberId: memberId,
        programId,
        balance,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      update: {
        balance,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { program: true },
    });
  }

  async getExpiringBalances(userId: string) {
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    return this.prisma.userMilesBalance.findMany({
      where: {
        userId,
        expiresAt: { not: null, lte: thirtyDaysLater, gte: now },
      },
      include: { program: true },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async updateWhatsappPhone(userId: string, phone: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { whatsappPhone: phone },
    });
    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }
}
