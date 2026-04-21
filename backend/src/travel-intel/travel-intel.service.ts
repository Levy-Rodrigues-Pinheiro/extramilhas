import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ALLIANCES, AllianceCode, PROGRAM_TO_ALLIANCE } from './alliances.data';

@Injectable()
export class TravelIntelService {
  constructor(private prisma: PrismaService) {}

  // ─── Airline alliances ──────────────────────────────────────────────

  async getAlliances() {
    return Object.values(ALLIANCES).filter((a) => a.code !== 'UNALIGNED');
  }

  async getAllianceForProgram(slug: string) {
    const code = PROGRAM_TO_ALLIANCE[slug] ?? 'UNALIGNED';
    return {
      program: slug,
      allianceCode: code,
      alliance: code !== 'UNALIGNED' ? ALLIANCES[code] : null,
    };
  }

  // ─── Stopover analyzer ──────────────────────────────────────────────

  /**
   * Simula economia de fazer stopover vs 2 viagens separadas.
   * Ex: usuario quer GRU→CDG e GRU→FCO. Se fizer GRU→CDG→FCO→GRU com
   * stopover em CDG, pode economizar até 40% em relação a 2 emissões
   * separadas (depende das award charts).
   *
   * Input: origem, 2 destinos, programa (opcional — usa melhor se omitido)
   * Output: breakdown lado a lado.
   */
  async analyzeStopover(params: {
    origin: string;
    destination1: string;
    destination2: string;
    programId?: string;
  }) {
    const origin = params.origin.toUpperCase();
    const d1 = params.destination1.toUpperCase();
    const d2 = params.destination2.toUpperCase();

    // Busca AwardChart pra cada perna
    const whereBase: any = { isActive: true, cabinClass: 'economy' };
    if (params.programId) whereBase.programId = params.programId;

    const [leg1, leg2, directCombined] = await Promise.all([
      this.prisma.awardChart.findFirst({
        where: { ...whereBase, origin, destination: d1 },
        orderBy: { milesRequired: 'asc' },
        include: { program: true },
      }),
      this.prisma.awardChart.findFirst({
        where: { ...whereBase, origin, destination: d2 },
        orderBy: { milesRequired: 'asc' },
        include: { program: true },
      }),
      // Stopover route — usa melhor match pra trip "origem→d1→d2→origem"
      this.prisma.awardChart.findFirst({
        where: { ...whereBase, origin, destination: d2 },
        orderBy: { milesRequired: 'asc' },
        include: { program: true },
      }),
    ]);

    const trip1Miles = leg1?.milesRequired ?? null;
    const trip2Miles = leg2?.milesRequired ?? null;
    const separateTotalMiles =
      trip1Miles !== null && trip2Miles !== null
        ? trip1Miles + trip2Miles
        : null;

    // Stopover estimate: regras comuns
    //   - Smiles: 10% extra por stopover
    //   - Latam: +5000 miles flat
    //   - Star Alliance (United/Aeroplan): GRATIS 1 stopover
    // Aqui simplificamos: 15% premium sobre leg mais longa como approx.
    const stopoverEstimate =
      directCombined !== null && trip1Miles !== null
        ? Math.round(
            Math.max(trip1Miles, trip2Miles ?? 0) * 1.15 +
              Math.min(trip1Miles, trip2Miles ?? 0) * 0.5,
          )
        : null;

    const savings =
      separateTotalMiles && stopoverEstimate
        ? separateTotalMiles - stopoverEstimate
        : null;
    const savingsPct =
      separateTotalMiles && savings
        ? Math.round((savings / separateTotalMiles) * 100)
        : null;

    return {
      origin,
      leg1: leg1
        ? {
            destination: d1,
            milesRequired: trip1Miles,
            program: leg1.program.name,
          }
        : null,
      leg2: leg2
        ? {
            destination: d2,
            milesRequired: trip2Miles,
            program: leg2.program.name,
          }
        : null,
      separate: {
        totalMiles: separateTotalMiles,
        description: '2 emissões separadas (ida+volta cada)',
      },
      stopover: {
        estimatedMiles: stopoverEstimate,
        description: `1 emissão ${origin}→${d1}→${d2}→${origin} (stopover em ${d1})`,
        caveat:
          'Estimativa baseada em regras comuns (+15% sobre leg mais longa). Valor real depende do programa e disponibilidade.',
      },
      verdict: {
        savings,
        savingsPct,
        recommendation:
          savings && savings > 0
            ? `Stopover economiza ~${Math.abs(savings).toLocaleString('pt-BR')} milhas (${savingsPct}%)`
            : 'Separadas parecem equivalentes ou melhores nesse caso',
      },
    };
  }

  // ─── Mileage run calculator ────────────────────────────────────────

  /**
   * Calcula quantos "mileage runs" (voos econômicos curtos) o user precisa
   * pra atingir status tier (Silver/Gold/Platinum) num programa.
   *
   * Simplificado: user diz programa + tier alvo + milhas/viagens já somadas.
   * Retorna # voos faltantes + custo estimado + quando valeria + quando não.
   *
   * Thresholds hardcoded de programas brasileiros populares.
   */
  async calculateMileageRun(params: {
    programSlug: string;
    targetTier: string;
    currentQualifyingMiles: number;
    avgFlightPriceBrl?: number;
    avgFlightMiles?: number;
  }) {
    const thresholds: Record<string, Record<string, number>> = {
      smiles: {
        PRATA: 10000,
        OURO: 25000,
        DIAMANTE: 50000,
      },
      latampass: {
        GOLD: 20000,
        PLATINUM: 40000,
        BLACK: 80000,
      },
      tudoazul: {
        SAFIRA: 10000,
        TOPAZIO: 30000,
        DIAMANTE: 60000,
      },
    };

    const programThresholds = thresholds[params.programSlug.toLowerCase()];
    if (!programThresholds) {
      return {
        error: `Programa ${params.programSlug} sem thresholds catalogados`,
      };
    }
    const targetMiles = programThresholds[params.targetTier.toUpperCase()];
    if (!targetMiles) {
      return {
        error: `Tier ${params.targetTier} não existe em ${params.programSlug}`,
        availableTiers: Object.keys(programThresholds),
      };
    }

    const milesStillNeeded = Math.max(0, targetMiles - params.currentQualifyingMiles);
    if (milesStillNeeded === 0) {
      return { alreadyQualified: true, targetMiles, currentMiles: params.currentQualifyingMiles };
    }

    const avgFlight = params.avgFlightMiles ?? 2000; // GRU-BSB-GRU típico
    const avgPrice = params.avgFlightPriceBrl ?? 500;
    const flightsNeeded = Math.ceil(milesStillNeeded / avgFlight);
    const totalCostBrl = flightsNeeded * avgPrice;

    // ROI: benefício do tier em R$ estimado. Valores approximation.
    const tierBenefitPerYear: Record<string, Record<string, number>> = {
      smiles: { PRATA: 500, OURO: 1500, DIAMANTE: 4000 },
      latampass: { GOLD: 800, PLATINUM: 2500, BLACK: 6000 },
      tudoazul: { SAFIRA: 600, TOPAZIO: 1800, DIAMANTE: 4500 },
    };
    const benefit =
      tierBenefitPerYear[params.programSlug.toLowerCase()]?.[params.targetTier.toUpperCase()] ??
      1000;

    const netRoi = benefit - totalCostBrl;

    return {
      program: params.programSlug,
      targetTier: params.targetTier,
      targetMiles,
      currentMiles: params.currentQualifyingMiles,
      milesStillNeeded,
      assumptions: {
        avgFlightMiles: avgFlight,
        avgFlightPriceBrl: avgPrice,
      },
      projection: {
        flightsNeeded,
        totalCostBrl,
        estimatedAnnualBenefitBrl: benefit,
        netRoiBrl: netRoi,
      },
      verdict:
        netRoi > 0
          ? `Vale a pena: gasta R$${totalCostBrl} e ganha ~R$${benefit}/ano em benefícios (ROI líquido R$${netRoi})`
          : `NÃO vale: custo R$${totalCostBrl} > benefício R$${benefit}/ano. Evite mileage run.`,
    };
  }
}
