import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gera código curto legível (ex: "LEVY2M9"). Usa parte do nome + sufixo
 * aleatório base36. Conflito é raríssimo mas tratado via retry.
 */
function generateCode(name: string | null | undefined): string {
  const clean = (name || 'USER')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${clean}${suffix}`;
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Garante que o user tem um código único. Idempotente (retorna o
   * existente se já tem). Retry até 5 vezes em caso de colisão.
   */
  async ensureCode(userId: string): Promise<string> {
    const existing = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;
    if (existing?.referralCode) return existing.referralCode;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode(existing?.name);
      try {
        const updated = (await this.prisma.user.update({
          where: { id: userId },
          data: { referralCode: code } as any,
        })) as any;
        this.logger.log(`Referral code generated for user=${userId}: ${code}`);
        return updated.referralCode;
      } catch {
        // Unique constraint hit → try again com sufixo diferente
      }
    }
    throw new Error('Failed to generate unique referral code after 5 attempts');
  }

  /**
   * Aplica o código referral num user novo (dentro de 7d do registro).
   * Efeitos:
   *  - users.referredById = referrerId
   *  - ambos ganham 30 dias Premium (se ainda são FREE)
   */
  async applyCode(newUserId: string, code: string): Promise<void> {
    const newUser = (await this.prisma.user.findUnique({
      where: { id: newUserId },
    })) as any;
    if (!newUser) throw new Error('User não encontrado');
    if (newUser.referredById) throw new Error('Você já usou um código de referral');

    // Não pode usar código próprio
    if (newUser.referralCode === code) {
      throw new Error('Não pode usar seu próprio código');
    }

    // Janela de 7d pós-registro (abuso)
    const registeredRecently =
      Date.now() - new Date(newUser.createdAt).getTime() < 7 * 86400_000;
    if (!registeredRecently) {
      throw new Error('Códigos só valem nos primeiros 7 dias após o registro');
    }

    const referrer = (await this.prisma.user.findFirst({
      where: { referralCode: code } as any,
    })) as any;
    if (!referrer) throw new Error('Código inválido');
    if (referrer.id === newUserId) throw new Error('Não pode usar seu próprio código');

    // Aplica em transação: vincula + concede premium aos 2
    const premiumExpiresAt = new Date(Date.now() + 30 * 86400_000);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: newUserId },
        data: {
          referredById: referrer.id,
          subscriptionPlan: newUser.subscriptionPlan === 'FREE' ? 'PREMIUM' : newUser.subscriptionPlan,
          subscriptionExpiresAt:
            newUser.subscriptionPlan === 'FREE'
              ? premiumExpiresAt
              : newUser.subscriptionExpiresAt,
        } as any,
      }),
      this.prisma.user.update({
        where: { id: referrer.id },
        data: {
          subscriptionPlan: referrer.subscriptionPlan === 'FREE' ? 'PREMIUM' : referrer.subscriptionPlan,
          // Se referrer já é Premium, estende 30d; se Pro, não mexe
          subscriptionExpiresAt:
            referrer.subscriptionPlan === 'PRO'
              ? referrer.subscriptionExpiresAt
              : this.extendBy30d(referrer.subscriptionExpiresAt),
        } as any,
      }),
    ]);

    this.logger.log(`Referral applied: ${referrer.id} → ${newUserId} (+30d Premium ambos)`);
  }

  private extendBy30d(current: Date | null): Date {
    const base = current && current > new Date() ? current : new Date();
    return new Date(base.getTime() + 30 * 86400_000);
  }

  async getStats(userId: string) {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
    })) as any;
    if (!user) throw new Error('User não encontrado');

    const code = user.referralCode || (await this.ensureCode(userId));

    const referralsCount = await this.prisma.user.count({
      where: { referredById: userId } as any,
    });

    // Count de referrals que viraram ativos (proxy: tem deviceToken recente)
    const activeReferrals = await this.prisma.user.count({
      where: {
        referredById: userId,
        deviceTokens: { some: { lastUsedAt: { gte: new Date(Date.now() - 30 * 86400_000) } } },
      } as any,
    });

    return {
      code,
      shareUrl: `https://milhasextras.com.br/r/${code}`,
      referralsCount,
      activeReferrals,
      rewardDays: referralsCount * 30,
      referredBy: user.referredById
        ? await this.prisma.user.findUnique({
            where: { id: user.referredById },
            select: { name: true },
          })
        : null,
    };
  }
}
