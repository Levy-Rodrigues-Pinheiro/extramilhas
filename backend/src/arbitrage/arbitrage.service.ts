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

export interface TransferCalculation {
  fromProgram: { slug: string; name: string; avgCpm: number };
  inputPoints: number;
  inputValueBrl: number;
  results: Array<{
    toProgram: { slug: string; name: string; avgCpm: number };
    bonusActive: number; // %
    expiresAt: string | null;
    resultingMiles: number;
    resultingValueBrl: number;
    valueGainBrl: number;
    gainPercent: number;
    recommendation: 'TRANSFERIR' | 'ESPERAR' | 'NAO_TRANSFERIR';
    reasoning: string;
    examples?: Array<{ destination: string; milesNeeded: number; tripsPossible: number }>;
  }>;
}

@Injectable()
export class ArbitrageService {
  private readonly logger = new Logger(ArbitrageService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * "Vale a pena transferir AGORA?"
   *
   * Usuário diz: "tenho X pontos no programa Y" → app calcula o que rinde
   * em CADA partnership ativa, com classificação clara (transferir, esperar
   * ou não vale).
   *
   * Critério de "ESPERAR": se o gainPercent atual está abaixo da média
   * histórica das últimas 5 ofertas (TODO quando tiver BonusHistory). Por
   * ora, ESPERAR só se gainPercent < 15% E currentBonus < 50%.
   */
  async calculateTransfer(input: {
    fromProgramSlug: string;
    points: number;
    toProgramSlug?: string; // se especificado, filtra
  }): Promise<TransferCalculation> {
    const fromProgram = await this.prisma.loyaltyProgram.findUnique({
      where: { slug: input.fromProgramSlug },
      select: { id: true, slug: true, name: true, avgCpmCurrent: true },
    });
    if (!fromProgram) {
      throw new Error(`Programa "${input.fromProgramSlug}" não encontrado`);
    }

    const sourceCpm = Number(fromProgram.avgCpmCurrent);
    const inputValueBrl = parseFloat(((input.points / 1000) * sourceCpm).toFixed(2));

    // Busca todas as partnerships ativas FROM esse programa
    const where: any = { fromProgramId: fromProgram.id, isActive: true };
    if (input.toProgramSlug) {
      const toProgram = await this.prisma.loyaltyProgram.findUnique({
        where: { slug: input.toProgramSlug },
        select: { id: true },
      });
      if (toProgram) where.toProgramId = toProgram.id;
    }

    const partnerships = await this.prisma.transferPartnership.findMany({
      where,
      include: {
        toProgram: { select: { id: true, slug: true, name: true, avgCpmCurrent: true } },
      },
    });

    const results: TransferCalculation['results'] = [];
    for (const p of partnerships) {
      const destCpm = Number(p.toProgram.avgCpmCurrent);
      const bonus = Number(p.currentBonus);
      const baseRate = Number(p.baseRate);
      const multiplier = baseRate * (1 + bonus / 100);

      const resultingMiles = Math.floor(input.points * multiplier);
      const resultingValueBrl = parseFloat(((resultingMiles / 1000) * destCpm).toFixed(2));
      const valueGainBrl = parseFloat((resultingValueBrl - inputValueBrl).toFixed(2));
      const gainPercent =
        inputValueBrl > 0
          ? parseFloat((((resultingValueBrl - inputValueBrl) / inputValueBrl) * 100).toFixed(1))
          : 0;

      let recommendation: TransferCalculation['results'][0]['recommendation'];
      let reasoning: string;

      if (gainPercent >= 30) {
        recommendation = 'TRANSFERIR';
        reasoning = `Ganho de ${gainPercent.toFixed(0)}% em valor (R$ ${valueGainBrl.toFixed(2)} a mais). Aproveite enquanto o bônus está ativo.`;
      } else if (gainPercent >= 5) {
        recommendation = 'TRANSFERIR';
        reasoning = `Ganho positivo de ${gainPercent.toFixed(0)}%. Vale a pena se você já tem destino certo pra usar.`;
      } else if (gainPercent < -10) {
        recommendation = 'NAO_TRANSFERIR';
        reasoning = `Você PERDE ${Math.abs(gainPercent).toFixed(0)}% transferindo agora. ${p.toProgram.name} tem CPM mais alto que ${fromProgram.name} sem o bônus.`;
      } else {
        recommendation = 'ESPERAR';
        reasoning = `Ganho marginal (${gainPercent.toFixed(1)}%). Bônus de ${bonus.toFixed(0)}% costuma melhorar — espera por uma promoção mais agressiva.`;
      }

      // Exemplos de uso: pega rotas populares no AwardChart do programa destino
      const exampleCharts = await this.prisma.awardChart.findMany({
        where: {
          programId: p.toProgramId,
          isActive: true,
          milesRequired: { lte: resultingMiles },
        },
        orderBy: { milesRequired: 'asc' },
        take: 3,
        select: { destinationName: true, destination: true, milesRequired: true },
      });

      const examples = exampleCharts.map((c) => ({
        destination: `${c.destination} (${c.destinationName})`,
        milesNeeded: c.milesRequired,
        tripsPossible: Math.floor(resultingMiles / c.milesRequired),
      }));

      results.push({
        toProgram: {
          slug: p.toProgram.slug,
          name: p.toProgram.name,
          avgCpm: destCpm,
        },
        bonusActive: bonus,
        expiresAt: p.expiresAt?.toISOString() ?? null,
        resultingMiles,
        resultingValueBrl,
        valueGainBrl,
        gainPercent,
        recommendation,
        reasoning,
        examples: examples.length > 0 ? examples : undefined,
      });
    }

    // Ordena: TRANSFERIR primeiro (por gainPercent desc), depois ESPERAR, depois NAO
    const order = { TRANSFERIR: 0, ESPERAR: 1, NAO_TRANSFERIR: 2 };
    results.sort((a, b) => {
      const oa = order[a.recommendation];
      const ob = order[b.recommendation];
      if (oa !== ob) return oa - ob;
      return b.gainPercent - a.gainPercent;
    });

    return {
      fromProgram: {
        slug: fromProgram.slug,
        name: fromProgram.name,
        avgCpm: sourceCpm,
      },
      inputPoints: input.points,
      inputValueBrl,
      results,
    };
  }

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
