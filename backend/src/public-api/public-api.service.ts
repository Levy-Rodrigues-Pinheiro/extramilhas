import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const TIER_LIMITS: Record<
  string,
  { monthlyQuota: number; dailyRate: number; perMinuteLimit: number }
> = {
  free: { monthlyQuota: 3000, dailyRate: 100, perMinuteLimit: 10 },
  starter: { monthlyQuota: 300_000, dailyRate: 10_000, perMinuteLimit: 100 },
  business: { monthlyQuota: 3_000_000, dailyRate: 100_000, perMinuteLimit: 1000 },
};

/**
 * In-memory rate limit per API key per minute. Mitiga burst attacks.
 * Limitação: não shared entre instâncias (Fly multi-region). Pra escala,
 * trocar por Redis SETEX/INCR. Por agora, barreira single-instance basta.
 * Bug fix HONEST_TEST_REPORT #SR-14.
 */
class InMemoryRateLimiter {
  private buckets = new Map<string, { count: number; minute: number }>();

  hit(key: string, limit: number): { allowed: boolean; remaining: number } {
    const now = Math.floor(Date.now() / 60000);
    const bucketKey = `${key}:${now}`;
    let entry = this.buckets.get(bucketKey);
    if (!entry) {
      entry = { count: 0, minute: now };
      this.buckets.set(bucketKey, entry);
      // Lazy GC: limpa buckets >2min quando Map passa 1k entries
      if (this.buckets.size > 1000) {
        for (const [k, v] of this.buckets.entries()) {
          if (now - v.minute > 2) this.buckets.delete(k);
        }
      }
    }
    entry.count++;
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
    };
  }
}

const rateLimiter = new InMemoryRateLimiter();

@Injectable()
export class PublicApiService {
  constructor(private prisma: PrismaService) {}

  private hashKey(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Cria uma nova API key. Retorna o plaintext APENAS nessa chamada.
   * Depois só armazena o hash — user não recupera, tem que gerar outra.
   */
  async createKey(userId: string, name: string, tier = 'free') {
    if (!TIER_LIMITS[tier]) throw new ForbiddenException('Tier inválido');
    const raw = `mx_${randomBytes(24).toString('hex')}`;
    const keyHash = this.hashKey(raw);
    const keyPrefix = raw.slice(0, 12);

    const created = await (this.prisma as any).apiKey.create({
      data: {
        ownerId: userId,
        name: name.slice(0, 100),
        keyHash,
        keyPrefix,
        tier,
      },
    });

    return {
      id: created.id,
      name: created.name,
      tier: created.tier,
      // Plaintext APENAS agora — nunca mais será exibido
      apiKey: raw,
      prefix: keyPrefix,
      quota: TIER_LIMITS[tier],
    };
  }

  async listMine(userId: string) {
    const keys = await (this.prisma as any).apiKey.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((k: any) => ({
      id: k.id,
      name: k.name,
      tier: k.tier,
      prefix: k.keyPrefix,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      requestsThisMonth: k.requestsThisMonth,
      quota: TIER_LIMITS[k.tier],
      createdAt: k.createdAt,
    }));
  }

  async revokeKey(userId: string, keyId: string) {
    const k = await (this.prisma as any).apiKey.findUnique({ where: { id: keyId } });
    if (!k || k.ownerId !== userId) throw new ForbiddenException('Sem permissão');
    await (this.prisma as any).apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
    return { revoked: true };
  }

  /**
   * Middleware helper — valida API key, rate limit mensal atômico, incrementa
   * counter. Retorna ownerId pra logar.
   *
   * Race fix: antes era check + update separados. Requests simultâneos
   * conseguiam ultrapassar quota (2999 check + 2999 check → 3001 final).
   * Agora updateMany com WHERE clause: incrementa APENAS se count < quota.
   * Se count >= quota, updatedCount=0 e rejeita.
   */
  async validateAndUse(apiKeyRaw: string): Promise<{ ownerId: string; tier: string }> {
    if (!apiKeyRaw || !apiKeyRaw.startsWith('mx_')) {
      throw new UnauthorizedException('API key inválida');
    }
    const keyHash = this.hashKey(apiKeyRaw);
    const key = await (this.prisma as any).apiKey.findUnique({ where: { keyHash } });
    if (!key || !key.isActive) {
      throw new UnauthorizedException('API key inválida ou revogada');
    }

    const quota = TIER_LIMITS[key.tier] ?? TIER_LIMITS.free;

    // Rate limit per-minute (bug fix #SR-14): burst attack blocker.
    // Free tier só pode 10 req/min = 600/h = dentro do 3k/mês se bem usado.
    const rlResult = rateLimiter.hit(key.id, quota.perMinuteLimit);
    if (!rlResult.allowed) {
      throw new ForbiddenException(
        `Rate limit excedido: ${quota.perMinuteLimit} req/min (tier ${key.tier}). Aguarde 1 min.`,
      );
    }

    // Atomic check-and-increment: UPDATE ... WHERE count < quota
    const result = await (this.prisma as any).apiKey.updateMany({
      where: {
        id: key.id,
        isActive: true,
        requestsThisMonth: { lt: quota.monthlyQuota },
      },
      data: {
        requestsThisMonth: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Ou key foi desativada, ou quota estourou entre findUnique e updateMany
      throw new ForbiddenException(
        `Quota mensal atingida (${quota.monthlyQuota}). Upgrade pra tier superior.`,
      );
    }

    return { ownerId: key.ownerId, tier: key.tier };
  }

  // ─── Dados públicos (CPM, programas, bônus ativos) ─────────────────

  async getProgramsSnapshot() {
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        avgCpmCurrent: true,
        websiteUrl: true,
      },
    });
    return programs;
  }

  async getActiveBonuses() {
    const bonuses = await this.prisma.transferPartnership.findMany({
      where: { isActive: true, currentBonus: { gt: 0 } },
      include: {
        fromProgram: { select: { slug: true, name: true, avgCpmCurrent: true } },
        toProgram: { select: { slug: true, name: true, avgCpmCurrent: true } },
      },
      orderBy: { currentBonus: 'desc' },
    });
    return bonuses.map((b) => ({
      id: b.id,
      from: b.fromProgram,
      to: b.toProgram,
      bonusPercent: Number(b.currentBonus),
      baseRate: Number(b.baseRate),
      expiresAt: b.expiresAt,
    }));
  }

  async getProgramHistory(slug: string, days = 30) {
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { slug },
    });
    if (!program) return null;
    const cutoff = new Date(Date.now() - days * 86400_000);
    const history = await this.prisma.priceHistory.findMany({
      where: { programId: program.id, date: { gte: cutoff } },
      orderBy: { date: 'asc' },
      select: { date: true, avgCpm: true, minCpm: true },
    });
    return {
      program: { slug: program.slug, name: program.name, currentCpm: program.avgCpmCurrent },
      history,
    };
  }
}
