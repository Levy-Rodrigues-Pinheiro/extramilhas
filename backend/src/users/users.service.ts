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
  /**
   * Retrospectiva semanal estilo Spotify Wrapped. Gera stats dos últimos 7d:
   *   - Notificações recebidas (bônus descobertos)
   *   - Missões progredidas
   *   - Streak atual
   *   - Oportunidade top (maior ganho%)
   *   - Economia estimada da semana (aproximada)
   *
   * Cliente usa pra gerar share card bonito. Mutação-free (só read).
   */
  /**
   * Portfolio analyzer — análise de diversificação + alertas.
   *
   * Outputs:
   *   - concentration: HHI (Herfindahl-Hirschman Index) do portfolio em %.
   *     <1500 = diversificado, 1500-2500 = moderado, >2500 = concentrado.
   *   - dominantProgram: programa com maior share
   *   - suggestions: array de recomendações concretas baseadas em regras
   */
  async analyzePortfolio(userId: string) {
    const balances = await this.prisma.userMilesBalance.findMany({
      where: { userId },
      include: { program: true },
    });
    const totalMiles = balances.reduce((s, b) => s + b.balance, 0);
    if (totalMiles === 0) {
      return {
        totalMiles: 0,
        totalValueBrl: 0,
        concentration: null,
        concentrationLabel: 'Sem saldo',
        dominantProgram: null,
        breakdown: [],
        suggestions: [
          {
            severity: 'info',
            title: 'Cadastre saldos',
            text: 'Adicione seus programas pra análise de diversificação.',
            action: '/wallet',
          },
        ],
      };
    }

    const totalValueBrl = balances.reduce(
      (s, b) => s + (b.balance / 1000) * (b.program.avgCpmCurrent || 25),
      0,
    );

    // HHI em pontos de 0-10000 (share^2 somados)
    const shares = balances.map((b) => {
      const share = b.balance / totalMiles;
      return {
        programId: b.programId,
        programName: b.program.name,
        programSlug: b.program.slug,
        balance: b.balance,
        sharePercent: Math.round(share * 1000) / 10,
        valueBrl: Math.round((b.balance / 1000) * (b.program.avgCpmCurrent || 25) * 100) / 100,
        cpm: b.program.avgCpmCurrent || 25,
      };
    });
    shares.sort((a, b) => b.balance - a.balance);
    const hhi = shares.reduce((s, x) => s + Math.pow(x.sharePercent * 10, 2) / 100, 0);
    const concentrationLabel =
      hhi < 1500 ? 'Diversificado' : hhi < 2500 ? 'Moderado' : 'Concentrado';
    const dominant = shares[0];

    // Regras de recomendação
    const suggestions: Array<{
      severity: 'info' | 'warn' | 'critical';
      title: string;
      text: string;
      action?: string;
    }> = [];

    if (dominant.sharePercent > 70) {
      suggestions.push({
        severity: 'warn',
        title: `Você está ${dominant.sharePercent}% em ${dominant.programName}`,
        text: 'Alta concentração num programa só aumenta risco (falência, mudança de regras). Considere diversificar.',
        action: '/arbitrage',
      });
    }

    // Saldos baixos (< 5k) — se acumular pra juntar
    const lowBalances = shares.filter((s) => s.balance > 0 && s.balance < 5000);
    if (lowBalances.length >= 2) {
      suggestions.push({
        severity: 'info',
        title: `${lowBalances.length} programas com saldo baixo (<5k)`,
        text: 'Pontos dispersos. Transferir pra 1-2 programas maximiza resgate. Veja oportunidades.',
        action: '/arbitrage',
      });
    }

    // Expiração — saldos vencendo em 90d
    const in90 = new Date(Date.now() + 90 * 86400_000);
    const expiringSoon = balances.filter(
      (b) => b.expiresAt && b.expiresAt < in90 && b.balance > 0,
    );
    if (expiringSoon.length > 0) {
      suggestions.push({
        severity: 'critical',
        title: `${expiringSoon.length} saldo${expiringSoon.length > 1 ? 's' : ''} expirando em <90d`,
        text: 'Use a calculadora pra decidir pra onde transferir antes de perder.',
        action: '/arbitrage',
      });
    }

    // CPM alto (programa caro vs mercado). Se um programa tem cpm >1.5x média, sinaliza
    const avgMarketCpm = 25;
    const expensivePrograms = shares.filter((s) => s.cpm > avgMarketCpm * 1.5);
    if (expensivePrograms.length > 0) {
      const names = expensivePrograms.map((e) => e.programName).join(', ');
      suggestions.push({
        severity: 'info',
        title: `CPM alto em ${names}`,
        text: `CPM acima de R$ ${(avgMarketCpm * 1.5).toFixed(0)} — em geral vale mais resgatar do que acumular.`,
      });
    }

    return {
      totalMiles,
      totalValueBrl: Math.round(totalValueBrl * 100) / 100,
      concentration: Math.round(hhi),
      concentrationLabel,
      dominantProgram: dominant,
      breakdown: shares,
      suggestions,
    };
  }

  /**
   * Predictive buy/sell signals — regras simples em cima de PriceHistory.
   *
   * Para cada programa com histórico suficiente (>=7 dias):
   *   - mediana dos últimos 30d
   *   - preço atual vs mediana → sinal
   *     - atual <= mediana * 0.85 → BUY forte
   *     - atual <= mediana * 0.95 → BUY
   *     - atual >= mediana * 1.15 → SELL (se user tem muito saldo, transferir)
   *
   * Treino real de ML fica pra próxima iteração; regras funcionam como
   * proxy razoável e zero dep.
   */
  async getPredictiveSignals() {
    const cutoff = new Date(Date.now() - 30 * 86400_000);
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      include: {
        priceHistory: {
          where: { date: { gte: cutoff } },
          orderBy: { date: 'desc' },
        },
      },
    });

    const signals = programs
      .filter((p) => p.priceHistory.length >= 7)
      .map((p) => {
        const cpms = p.priceHistory.map((h) => h.avgCpm).sort((a, b) => a - b);
        const median = cpms[Math.floor(cpms.length / 2)];
        const current = p.avgCpmCurrent;
        const ratio = current / median;

        let signal: 'BUY_STRONG' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
        let text = '';
        if (ratio <= 0.85) {
          signal = 'BUY_STRONG';
          text = `CPM ${((1 - ratio) * 100).toFixed(0)}% abaixo da mediana 30d. Momento forte pra acumular ou comprar pontos.`;
        } else if (ratio <= 0.95) {
          signal = 'BUY';
          text = `CPM abaixo da mediana 30d. Bom momento pra acumular.`;
        } else if (ratio >= 1.15) {
          signal = 'SELL';
          text = `CPM ${((ratio - 1) * 100).toFixed(0)}% acima da mediana. Se tem saldo parado, considere transferir.`;
        } else {
          text = 'CPM em linha com mediana. Neutro.';
        }

        return {
          programId: p.id,
          programName: p.name,
          programSlug: p.slug,
          currentCpm: current,
          median30d: Math.round(median * 100) / 100,
          signal,
          text,
          ratio: Math.round(ratio * 100) / 100,
        };
      })
      .sort((a, b) => {
        const order = { BUY_STRONG: 0, SELL: 1, BUY: 2, HOLD: 3 };
        return order[a.signal] - order[b.signal];
      });

    return signals;
  }

  async getWeeklyRetrospective(userId: string) {
    const now = Date.now();
    const weekAgo = new Date(now - 7 * 86400_000);

    const [user, notifications, missions, streak, balances] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, createdAt: true },
      }),
      this.prisma.notification.findMany({
        where: { userId, createdAt: { gte: weekAgo } },
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).userMission.findMany({
        where: { userId, updatedAt: { gte: weekAgo } },
      }),
      (this.prisma as any).userStreak.findUnique({ where: { userId } }),
      this.prisma.userMilesBalance.findMany({
        where: { userId },
        include: { program: true },
      }),
    ]);

    const totalMiles = balances.reduce((s, b) => s + b.balance, 0);
    const walletValueBrl = balances.reduce(
      (s, b) => s + (b.balance / 1000) * (b.program.avgCpmCurrent || 25),
      0,
    );

    // Bônus top da semana — maior currentBonus ativo
    const topBonus = await this.prisma.transferPartnership.findFirst({
      where: { isActive: true, currentBonus: { gt: 0 } },
      orderBy: { currentBonus: 'desc' },
      include: { fromProgram: true, toProgram: true },
    });

    const missionsProgressed = missions.filter((m: any) => m.progress > 0).length;
    const notifBonus = notifications.filter((n) => n.type === 'bonus_active' || n.type === 'alert_match').length;

    return {
      userName: user?.name?.split(' ')[0] ?? 'Você',
      weekStart: weekAgo.toISOString(),
      weekEnd: new Date(now).toISOString(),
      stats: {
        notificationsReceived: notifications.length,
        bonusAlertsReceived: notifBonus,
        missionsProgressed,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        walletTotalMiles: totalMiles,
        walletValueBrl: Math.round(walletValueBrl * 100) / 100,
      },
      topBonus: topBonus
        ? {
            from: topBonus.fromProgram.name,
            to: topBonus.toProgram.name,
            bonusPercent: Math.round(Number(topBonus.currentBonus)),
          }
        : null,
    };
  }

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
