import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sistema de feature flags + A/B tests.
 *
 * FeatureFlag: booleano por user. Usa hash estável do userId pra decidir
 * bucket (mesmo user = mesmo resultado em múltiplos hits). Cache em memória
 * de 60s pra evitar N consultas por request.
 *
 * Experiment: multi-variante (control/variant_a/variant_b). Mesma ideia de
 * hash estável, mas com weight por variante somando 100.
 *
 * Convenção: flag-key em kebab-case. Experimento = prefixo "ab-".
 */
@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private flagCache = new Map<string, { value: any; at: number }>();
  private readonly CACHE_TTL_MS = 60_000;

  constructor(private prisma: PrismaService) {}

  /**
   * Hash determinístico do (userId + key) → 0-99. Permite rollout gradual
   * com cohort estável: user que está no 10% inicial continua no 10%
   * quando rollout sobe pra 30%.
   */
  private hashToBucket(userId: string, key: string): number {
    const h = createHash('sha256').update(`${userId}:${key}`).digest('hex');
    // Usa os primeiros 8 chars como int32 → mod 100
    const n = parseInt(h.slice(0, 8), 16);
    return n % 100;
  }

  async isEnabled(key: string, userId?: string): Promise<boolean> {
    const cached = this.flagCache.get(key);
    const now = Date.now();
    let flag: any;
    if (cached && now - cached.at < this.CACHE_TTL_MS) {
      flag = cached.value;
    } else {
      flag = await (this.prisma as any).featureFlag.findUnique({ where: { key } });
      this.flagCache.set(key, { value: flag, at: now });
    }
    if (!flag) return false;
    if (flag.mode === 'off') return false;
    if (flag.mode === 'on') return true;
    if (flag.mode !== 'rollout') return false;
    // rollout
    if (userId) {
      // allowlist sempre passa
      try {
        const allow = JSON.parse(flag.allowlist || '[]') as string[];
        if (Array.isArray(allow) && allow.includes(userId)) return true;
      } catch {
        /* ignore */
      }
      return this.hashToBucket(userId, key) < flag.percentage;
    }
    // Sem userId (request anônimo): usa random estável por request não faz sentido.
    // Retorna false pra evitar flakiness.
    return false;
  }

  async assignVariant(key: string, userId: string): Promise<string | null> {
    const exp = await (this.prisma as any).experiment.findUnique({ where: { key } });
    if (!exp || !exp.isActive) return null;
    let variants: Array<{ name: string; weight: number }> = [];
    try {
      variants = JSON.parse(exp.variants || '[]');
    } catch {
      return null;
    }
    if (variants.length === 0) return null;
    const total = variants.reduce((s, v) => s + v.weight, 0);
    if (total <= 0) return null;
    const bucket = this.hashToBucket(userId, key) % total;
    let acc = 0;
    for (const v of variants) {
      acc += v.weight;
      if (bucket < acc) return v.name;
    }
    return variants[0].name;
  }

  async listAll() {
    const [flags, experiments] = await Promise.all([
      (this.prisma as any).featureFlag.findMany({ orderBy: { key: 'asc' } }),
      (this.prisma as any).experiment.findMany({ orderBy: { key: 'asc' } }),
    ]);
    return { flags, experiments };
  }

  async upsertFlag(params: {
    key: string;
    description: string;
    mode: string;
    percentage?: number;
    allowlist?: string[];
  }) {
    this.flagCache.delete(params.key);
    return (this.prisma as any).featureFlag.upsert({
      where: { key: params.key },
      create: {
        key: params.key,
        description: params.description,
        mode: params.mode,
        percentage: params.percentage ?? 0,
        allowlist: JSON.stringify(params.allowlist ?? []),
      },
      update: {
        description: params.description,
        mode: params.mode,
        percentage: params.percentage,
        allowlist: params.allowlist ? JSON.stringify(params.allowlist) : undefined,
      },
    });
  }

  async upsertExperiment(params: {
    key: string;
    description: string;
    variants: Array<{ name: string; weight: number }>;
    isActive?: boolean;
  }) {
    return (this.prisma as any).experiment.upsert({
      where: { key: params.key },
      create: {
        key: params.key,
        description: params.description,
        variants: JSON.stringify(params.variants),
        isActive: params.isActive ?? true,
      },
      update: {
        description: params.description,
        variants: JSON.stringify(params.variants),
        isActive: params.isActive,
      },
    });
  }

  /**
   * Resolve o payload completo pra um user (todas flags + variantes dos
   * experimentos ativos). Chamado no boot do mobile.
   */
  async resolveForUser(userId: string) {
    const [flags, experiments] = await Promise.all([
      (this.prisma as any).featureFlag.findMany(),
      (this.prisma as any).experiment.findMany({ where: { isActive: true } }),
    ]);

    const resolvedFlags: Record<string, boolean> = {};
    for (const f of flags) {
      const cached = { value: f, at: Date.now() };
      this.flagCache.set(f.key, cached);
      resolvedFlags[f.key] = await this.isEnabled(f.key, userId);
    }

    const resolvedExperiments: Record<string, string> = {};
    for (const e of experiments) {
      const variant = await this.assignVariant(e.key, userId);
      if (variant) resolvedExperiments[e.key] = variant;
    }

    return { flags: resolvedFlags, experiments: resolvedExperiments };
  }
}
