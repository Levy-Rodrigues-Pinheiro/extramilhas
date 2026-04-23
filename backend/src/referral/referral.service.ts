import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gera código curto legível (ex: "LEVY2M9"). Usa parte do nome + sufixo
 * aleatório base36. Conflito é raríssimo mas tratado via retry.
 *
 * SR-RNG-02: antes Math.random() — previsível. Agora crypto.randomBytes.
 */
function generateCode(name: string | null | undefined): string {
  const clean = (name || 'USER')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  // 3 bytes base36 = ~5 chars A-Z/0-9, bem mais entropia que 3 chars
  const suffix = parseInt(randomBytes(3).toString('hex'), 16)
    .toString(36)
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, '0');
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
    // Race fix: toda a operação em 1 transação com re-check dentro.
    // Antes, findUnique + findFirst + update eram separados — 2 requests
    // simultâneos podiam conceder Premium 2x (double-bonus fraud).
    // Agora: lock otimista via updateMany com WHERE referredById:null.
    const premiumExpiresAt = new Date(Date.now() + 30 * 86400_000);

    await this.prisma.$transaction(async (tx) => {
      const newUser = (await tx.user.findUnique({
        where: { id: newUserId },
      })) as any;
      if (!newUser) throw new Error('User não encontrado');
      if (newUser.referredById) throw new Error('Você já usou um código de referral');
      if (newUser.referralCode === code) {
        throw new Error('Não pode usar seu próprio código');
      }

      const registeredRecently =
        Date.now() - new Date(newUser.createdAt).getTime() < 7 * 86400_000;
      if (!registeredRecently) {
        throw new Error('Códigos só valem nos primeiros 7 dias após o registro');
      }

      const referrer = (await tx.user.findFirst({
        where: { referralCode: code } as any,
      })) as any;
      if (!referrer) throw new Error('Código inválido');
      if (referrer.id === newUserId) {
        throw new Error('Não pode usar seu próprio código');
      }

      // updateMany com WHERE referredById:null — atomic check + set.
      // Se outro request gravou referredById entre findUnique e update,
      // rowsAffected=0 e a transação falha explicitamente.
      const applied = await tx.user.updateMany({
        where: { id: newUserId, referredById: null } as any,
        data: {
          referredById: referrer.id,
          subscriptionPlan:
            newUser.subscriptionPlan === 'FREE' ? 'PREMIUM' : newUser.subscriptionPlan,
          subscriptionExpiresAt:
            newUser.subscriptionPlan === 'FREE'
              ? premiumExpiresAt
              : newUser.subscriptionExpiresAt,
        } as any,
      });
      if (applied.count === 0) {
        throw new Error(
          'Referral já foi aplicado (race condition detectada). Não há double-bonus.',
        );
      }
      await tx.user.update({
        where: { id: referrer.id },
        data: {
          subscriptionPlan:
            referrer.subscriptionPlan === 'FREE' ? 'PREMIUM' : referrer.subscriptionPlan,
          subscriptionExpiresAt:
            referrer.subscriptionPlan === 'PRO'
              ? referrer.subscriptionExpiresAt
              : this.extendBy30d(referrer.subscriptionExpiresAt),
        } as any,
      });

      this.logger.log(`Referral applied: ${referrer.id} → ${newUserId} (+30d Premium ambos)`);
    });
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
