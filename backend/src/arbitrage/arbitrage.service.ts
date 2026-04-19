import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Detecção de oportunidades de arbitragem de milhas.
 *
 * Primeira implementação: transferência com bônus.
 * Escopo: dado uma TransferPartnership ativa com currentBonus>0, calcula
 * se o CPM efetivo do destino (após aplicar bônus) é menor que o CPM
 * da fonte — se for, virou "grana de graça".
 *
 * Formula:
 *   resultingMiles = sourceMiles × baseRate × (1 + currentBonus/100)
 *   effectiveCpm   = (sourceMiles × sourceProgram.avgCpm) / resultingMiles
 *                  = sourceProgram.avgCpm / (baseRate × (1 + bonus/100))
 *
 *   valueGain = (toProgram.avgCpm - effectiveCpm) × resultingMiles / 1000
 *
 * Se o usuário está autenticado, prioriza partnerships em que ele tem saldo
 * na fromProgram.
 */

export interface TransferOpportunity {
  id: string;
  fromProgram: {
    id: string;
    slug: string;
    name: string;
    avgCpm: number;
  };
  toProgram: {
    id: string;
    slug: string;
    name: string;
    avgCpm: number;
  };
  baseRate: number;
  currentBonus: number; // porcentagem, ex: 100 = 100% bônus = 2x
  expiresAt: string | null;

  /** CPM efetivo no programa destino após o bônus */
  effectiveCpm: number;
  /** Ganho em R$ por 1000 milhas transferidas */
  valueGainPer1000: number;
  /** Taxa de ganho (%) — quanto mais alto, melhor */
  gainPercent: number;
  /** Saldo que o usuário tem no programa fonte (se autenticado) */
  userSourceBalance?: number;
  /** Milhas resultantes se usar o saldo todo */
  potentialResultingMiles?: number;
  /** R$ de valor extra capturável se usar saldo todo */
  potentialValueGain?: number;

  /** Selo: IMPERDIVEL | BOA | NORMAL — guia UI */
  classification: 'IMPERDIVEL' | 'BOA' | 'NORMAL';
  /** Sentença pronta pra UI */
  summary: string;
}

@Injectable()
export class ArbitrageService {
  private readonly logger = new Logger(ArbitrageService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lista oportunidades de transferência com bônus ativo.
   * Se userId fornecido, personaliza com saldo real.
   */
  async transferBonusOpportunities(userId?: string): Promise<TransferOpportunity[]> {
    // Busca todas as partnerships ativas com bônus > 0 (ou expiresAt futuro)
    const now = new Date();
    const partnerships = await this.prisma.transferPartnership.findMany({
      where: {
        isActive: true,
        OR: [
          { currentBonus: { gt: 0 } },
          { AND: [{ expiresAt: { gt: now } }, { currentBonus: { gt: 0 } }] },
        ],
      },
      include: {
        fromProgram: { select: { id: true, slug: true, name: true, avgCpmCurrent: true } },
        toProgram: { select: { id: true, slug: true, name: true, avgCpmCurrent: true } },
      },
    });

    // Carrega saldos do usuário se autenticado
    let balanceByProgram = new Map<string, number>();
    if (userId) {
      const balances = await this.prisma.userMilesBalance.findMany({
        where: { userId },
        select: { programId: true, balance: true },
      });
      balanceByProgram = new Map(balances.map((b) => [b.programId, b.balance]));
    }

    const opportunities: TransferOpportunity[] = partnerships.map((p) => {
      const sourceCpm = Number(p.fromProgram.avgCpmCurrent);
      const destCpm = Number(p.toProgram.avgCpmCurrent);
      const multiplier = Number(p.baseRate) * (1 + Number(p.currentBonus) / 100);
      const effectiveCpm = sourceCpm / multiplier;

      const valueGainPer1000 = (destCpm - effectiveCpm) * multiplier;
      const gainPercent =
        effectiveCpm > 0 && destCpm > 0
          ? parseFloat((((destCpm - effectiveCpm) / destCpm) * 100).toFixed(1))
          : 0;

      // Personalização com saldo
      const userSourceBalance = balanceByProgram.get(p.fromProgramId);
      const potentialResultingMiles =
        userSourceBalance && userSourceBalance > 0
          ? Math.floor(userSourceBalance * multiplier)
          : undefined;
      const potentialValueGain =
        userSourceBalance && userSourceBalance > 0
          ? parseFloat(((userSourceBalance / 1000) * valueGainPer1000).toFixed(2))
          : undefined;

      let classification: TransferOpportunity['classification'];
      if (gainPercent >= 50) classification = 'IMPERDIVEL';
      else if (gainPercent >= 25) classification = 'BOA';
      else classification = 'NORMAL';

      const bonusStr = Number(p.currentBonus).toFixed(0);
      const summary = `${p.fromProgram.name} → ${p.toProgram.name} com ${bonusStr}% bônus · CPM efetivo R$${effectiveCpm.toFixed(2)}`;

      return {
        id: p.id,
        fromProgram: {
          id: p.fromProgram.id,
          slug: p.fromProgram.slug,
          name: p.fromProgram.name,
          avgCpm: sourceCpm,
        },
        toProgram: {
          id: p.toProgram.id,
          slug: p.toProgram.slug,
          name: p.toProgram.name,
          avgCpm: destCpm,
        },
        baseRate: Number(p.baseRate),
        currentBonus: Number(p.currentBonus),
        expiresAt: p.expiresAt?.toISOString() ?? null,
        effectiveCpm: parseFloat(effectiveCpm.toFixed(2)),
        valueGainPer1000: parseFloat(valueGainPer1000.toFixed(2)),
        gainPercent,
        userSourceBalance,
        potentialResultingMiles,
        potentialValueGain,
        classification,
        summary,
      };
    });

    // Ordena por ganho potencial (se tem saldo) ou por gainPercent
    opportunities.sort((a, b) => {
      if (a.potentialValueGain && b.potentialValueGain) {
        return b.potentialValueGain - a.potentialValueGain;
      }
      if (a.potentialValueGain) return -1;
      if (b.potentialValueGain) return 1;
      return b.gainPercent - a.gainPercent;
    });

    return opportunities;
  }
}
