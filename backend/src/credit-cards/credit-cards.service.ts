import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Recommender de cartão de crédito. Dado:
 *   - Gasto médio mensal do user (input)
 *   - Distribuição por categoria (input opcional)
 *   - Renda (input — filtra cartões que exigem > renda)
 *   - CPM médio do programa principal (do DB)
 *
 * Calcula:
 *   - Pontos/ano = 12 * (gasto * pointsPerBrl * avgMultiplier) + welcomePoints
 *     (só conta welcome se gasto > welcomeSpendBrl em 90d)
 *   - Valor/ano em R$ = (pontos/1000) * CPM
 *   - ROI líquido = valor/ano - anualFee
 *   - Score = ROI / anualFee (quanto dá de retorno por R$ de anuidade)
 *
 * Retorna top 5 ordenados por ROI líquido descendente.
 */
@Injectable()
export class CreditCardsService {
  constructor(private prisma: PrismaService) {}

  async listAll() {
    return (this.prisma as any).creditCard.findMany({
      where: { isActive: true },
      orderBy: [{ tier: 'desc' }, { annualFeeBrl: 'asc' }],
    });
  }

  async recommend(params: {
    monthlySpendBrl: number;
    monthlyIncomeBrl?: number;
    categories?: Record<string, number>; // % do gasto em cada categoria
  }) {
    const cards = await (this.prisma as any).creditCard.findMany({
      where: { isActive: true },
    });

    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { isActive: true },
    });
    const cpmByProgram = new Map(
      programs.map((p) => [p.slug, p.avgCpmCurrent ?? 25]),
    );

    const spendCentavos = params.monthlySpendBrl * 100;
    const incomeCentavos = (params.monthlyIncomeBrl ?? 0) * 100;
    const categories = params.categories ?? {};

    const scored = cards
      .filter((c: any) => c.minIncomeBrl === 0 || incomeCentavos >= c.minIncomeBrl)
      .map((c: any) => {
        let multipliers: Record<string, number> = {};
        try {
          multipliers = JSON.parse(c.categoryBonuses);
        } catch {
          /* ignore */
        }

        // Avg multiplier ponderado por categoria (default 1x pra não listada)
        let avgMultiplier = 1;
        if (Object.keys(categories).length > 0) {
          let weightedSum = 0;
          let totalWeight = 0;
          for (const [cat, pct] of Object.entries(categories)) {
            const mult = multipliers[cat] ?? 1;
            weightedSum += mult * pct;
            totalWeight += pct;
          }
          const uncategorizedPct = Math.max(0, 1 - totalWeight);
          avgMultiplier = (weightedSum + uncategorizedPct) / 1;
        }

        const pointsPerMonth = (spendCentavos / 100) * c.pointsPerBrl * avgMultiplier;
        const yearlyPoints = pointsPerMonth * 12;

        // Welcome: conta se gasto projetado em 3m atinge threshold
        let welcomePoints = 0;
        if (
          c.welcomePoints > 0 &&
          spendCentavos * 3 >= c.welcomeSpendBrl
        ) {
          welcomePoints = c.welcomePoints;
        }

        const totalPointsYear = yearlyPoints + welcomePoints;
        const cpm = cpmByProgram.get(c.mainProgramSlug) ?? 25;
        const valueBrlYear = (totalPointsYear / 1000) * cpm;
        const annualFeeBrl = c.annualFeeBrl / 100;
        const netRoiBrl = valueBrlYear - annualFeeBrl;

        return {
          card: {
            id: c.id,
            name: c.name,
            issuer: c.issuer,
            brand: c.brand,
            tier: c.tier,
            logoUrl: c.logoUrl,
            officialUrl: c.officialUrl,
            mainProgramSlug: c.mainProgramSlug,
          },
          breakdown: {
            pointsPerMonth: Math.round(pointsPerMonth),
            yearlyPoints: Math.round(yearlyPoints),
            welcomePoints,
            totalPointsYear: Math.round(totalPointsYear),
            cpmUsed: cpm,
            valueBrlYear: Math.round(valueBrlYear * 100) / 100,
            annualFeeBrl,
            netRoiBrl: Math.round(netRoiBrl * 100) / 100,
            avgMultiplier: Math.round(avgMultiplier * 100) / 100,
          },
          reasoning:
            netRoiBrl > 0
              ? `Retorno líquido estimado R$${netRoiBrl.toFixed(0)}/ano (após anuidade R$${annualFeeBrl.toFixed(0)})`
              : `Anuidade R$${annualFeeBrl.toFixed(0)} maior que retorno estimado — não compensa pro seu perfil`,
        };
      })
      .sort((a: any, b: any) => b.breakdown.netRoiBrl - a.breakdown.netRoiBrl);

    return {
      topRecommendation: scored[0] ?? null,
      alternatives: scored.slice(1, 5),
      allEligibleCount: scored.length,
      totalCardsInCatalog: cards.length,
      disclaimer:
        'Cálculo estimativo baseado em CPM médio. ROI real depende de pra onde você transfere e quando resgata.',
    };
  }
}
