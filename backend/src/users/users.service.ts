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

  /**
   * LGPD delete: apaga dados pessoais, anonimiza user record pra preservar
   * FKs em audit/bonus reports históricos.
   */
  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User não encontrado');

    const anonEmail = `deleted-${user.id}@anonymous.invalid`;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          name: 'Usuário Deletado',
          passwordHash: null,
          refreshToken: null,
          whatsappPhone: null,
          referralCode: null,
          lastActiveAt: null,
        } as any,
      }),
      this.prisma.deviceToken.deleteMany({ where: { userId } }),
      this.prisma.userMilesBalance.deleteMany({ where: { userId } }),
      this.prisma.familyMember.deleteMany({ where: { userId } }),
      this.prisma.alert.deleteMany({ where: { userId } }),
      this.prisma.savedOffer.deleteMany({ where: { userId } }),
      this.prisma.userPreference.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.bonusReport.updateMany({
        where: { reporterId: userId },
        data: { reporterEmail: null },
      }),
    ]);
    return { deleted: true };
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

  async deleteFamilyMemberBalance(userId: string, memberId: string, programId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, userId },
    });
    if (!member) {
      throw new NotFoundException('Family member not found');
    }
    await this.prisma.familyMemberBalance.deleteMany({
      where: { familyMemberId: memberId, programId },
    });
    return { message: 'Balance removed' };
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

  /**
   * Dashboard pessoal: número de alertas recebidos, transferências sugeridas
   * realizadas (aproximado via notificações lidas de tipo="arbitrage"),
   * economia estimada com base em bônus ativos casados com saldo do user.
   *
   * Nota: "economia" aqui é uma ESTIMATIVA (não temos tracking real de
   * transferências feitas fora do app). Calcula: se user tem X pontos num
   * programa que hoje tem bônus Y%, economia hipotética = X * CPM * Y%.
   */
  /**
   * Lista dispositivos conectados. DeviceToken serve como proxy de sessão:
   * enquanto o token existe, o dispositivo recebe push; revogar = desregistrar
   * o push. Se o user loga de novo, cria novo token. Suficiente pra "dispositivos
   * ativos" sem adicionar tabela UserSession separada.
   */
  async listActiveSessions(userId: string) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        platform: true,
        appVersion: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    const now = Date.now();
    return tokens.map((t) => ({
      ...t,
      isRecent: now - t.lastUsedAt.getTime() < 7 * 86400_000,
      ageDays: Math.floor((now - t.createdAt.getTime()) / 86400_000),
    }));
  }

  async revokeSession(userId: string, tokenId: string) {
    const token = await this.prisma.deviceToken.findFirst({
      where: { id: tokenId, userId },
    });
    if (!token) throw new NotFoundException('Sessão não encontrada');
    await this.prisma.deviceToken.delete({ where: { id: tokenId } });
    return { revoked: true };
  }

  async getDashboardStats(userId: string) {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      balances,
      notifTotal,
      notifThisYear,
      notifLastMonth,
      alertsCount,
      activeBonuses,
      missionsClaimed,
    ] = await Promise.all([
      this.prisma.userMilesBalance.findMany({
        where: { userId },
        include: { program: true },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, createdAt: { gte: yearStart } } }),
      this.prisma.notification.count({ where: { userId, createdAt: { gte: monthStart } } }),
      this.prisma.alert.count({ where: { userId } }),
      this.prisma.transferPartnership.findMany({
        where: { isActive: true, currentBonus: { gt: 0 } },
        include: { fromProgram: true, toProgram: true },
      }),
      (this.prisma as any).userMission.count({
        where: { userId, rewardClaimedAt: { not: null } },
      }),
    ]);

    // Estimativa de economia: para cada programa com saldo, pega o maior
    // bônus ativo como fromProgram e calcula ganho em R$.
    let estimatedSavings = 0;
    for (const b of balances) {
      const bonusForThis = activeBonuses.find((ab) => ab.fromProgramId === b.programId);
      if (bonusForThis) {
        const cpm = bonusForThis.toProgram.avgCpmCurrent || 25;
        const multiplier = 1 + Number(bonusForThis.currentBonus) / 100;
        // ganho = pontos * multiplier extras * cpm/1000
        const gain = b.balance * (multiplier - 1) * (cpm / 1000);
        estimatedSavings += gain;
      }
    }

    return {
      savingsTotal: Math.round(estimatedSavings * 100) / 100,
      savingsEstimateNote:
        'Estimativa baseada em bônus ATIVOS hoje cruzados com seu saldo atual. Não reflete transferências reais.',
      notifications: {
        total: notifTotal,
        thisYear: notifThisYear,
        lastMonth: notifLastMonth,
      },
      alertsConfigured: alertsCount,
      missionsCompleted: missionsClaimed,
      walletPrograms: balances.length,
      walletTotalMiles: balances.reduce((s, b) => s + b.balance, 0),
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Exporta dados do user em CSV (LGPD-friendly: todos os dados que temos dele).
   * Retorna o CSV como string junto com um filename sugerido. O mobile decide
   * se compartilha (Share.share) ou salva.
   */
  /**
   * Relatório de IR — milhas/pontos como ativos no IRPF. Gera CSV estruturado
   * seguindo orientação Receita Federal (Bens e Direitos, grupo 99):
   *   - Saldo em 31/12/N-1 (posição anterior)
   *   - Saldo em 31/12/N (posição atual)
   *   - CPM médio do ano como proxy de valor
   *
   * Nota: RFB não tem regra clara pra pontos; recomendação majoritária é
   * declarar os saldos *se cumulativamente* >R$ 40k. App fornece planilha
   * pronta pro contador.
   */
  async exportTaxReportCsv(userId: string, year: number) {
    const balances = await this.prisma.userMilesBalance.findMany({
      where: { userId },
      include: { program: true },
    });
    const lines: string[] = [];
    const esc = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    lines.push(`# DECLARAÇÃO DE MILHAS/PONTOS — ANO-BASE ${year}`);
    lines.push(
      '# Grupo 99 — Outros bens e direitos. Código sugerido: 99 (outros bens).',
    );
    lines.push(
      '# Consulte seu contador. Valores são ESTIMATIVAS baseadas em CPM médio.',
    );
    lines.push('');
    lines.push('programa,saldoPontos,cpmMedio,valorEstimadoBRL');
    let totalBrl = 0;
    for (const b of balances) {
      const cpm = b.program.avgCpmCurrent || 25;
      const valor = (b.balance / 1000) * cpm;
      totalBrl += valor;
      lines.push(
        [
          b.program.name,
          b.balance,
          cpm.toFixed(2),
          valor.toFixed(2),
        ]
          .map(esc)
          .join(','),
      );
    }
    lines.push('');
    lines.push(`TOTAL,,${totalBrl.toFixed(2)},${totalBrl.toFixed(2)}`);
    lines.push('');
    lines.push(
      '# Observação: se total > R$ 40.000, considere declarar. Se < R$ 40.000, isento.',
    );

    return {
      csv: lines.join('\n'),
      filename: `ir-milhas-${year}-${new Date().toISOString().slice(0, 10)}.csv`,
      year,
      totalEstimatedBrl: Math.round(totalBrl * 100) / 100,
      programsCount: balances.length,
    };
  }

  async exportUserDataCsv(userId: string) {
    const [user, balances, alerts, notifications, family] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, createdAt: true, subscriptionPlan: true },
      }),
      this.prisma.userMilesBalance.findMany({
        where: { userId },
        include: { program: { select: { name: true, slug: true } } },
      }),
      this.prisma.alert.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500, // limitamos pra não estourar payload
      }),
      this.prisma.familyMember.findMany({
        where: { userId },
        include: { balances: { include: { program: true } } },
      }),
    ]);

    const lines: string[] = [];
    const esc = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    lines.push('# USER');
    lines.push('id,email,name,createdAt,plan');
    if (user) {
      lines.push(
        [user.id, user.email, user.name, user.createdAt.toISOString(), user.subscriptionPlan]
          .map(esc)
          .join(','),
      );
    }
    lines.push('');

    lines.push('# WALLET BALANCES');
    lines.push('program,balance,expiresAt,updatedAt');
    for (const b of balances) {
      lines.push(
        [b.program.name, b.balance, b.expiresAt?.toISOString() ?? '', b.updatedAt.toISOString()]
          .map(esc)
          .join(','),
      );
    }
    lines.push('');

    lines.push('# ALERTS');
    lines.push('type,conditions,isActive,createdAt,lastTriggeredAt');
    for (const a of alerts) {
      lines.push(
        [
          a.type,
          a.conditions,
          a.isActive,
          a.createdAt.toISOString(),
          a.lastTriggeredAt?.toISOString() ?? '',
        ]
          .map(esc)
          .join(','),
      );
    }
    lines.push('');

    lines.push('# FAMILY MEMBERS');
    lines.push('name,relationship,programs_count,total_miles');
    for (const m of family) {
      const total = m.balances.reduce((s, b) => s + b.balance, 0);
      lines.push([m.name, m.relationship, m.balances.length, total].map(esc).join(','));
    }
    lines.push('');

    lines.push('# NOTIFICATIONS (last 500)');
    lines.push('type,title,body,isRead,createdAt');
    for (const n of notifications) {
      lines.push(
        [n.type, n.title, n.body, n.isRead, n.createdAt.toISOString()].map(esc).join(','),
      );
    }

    const csv = lines.join('\n');
    const filename = `milhas-extras-export-${new Date().toISOString().slice(0, 10)}.csv`;
    return { csv, filename };
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
