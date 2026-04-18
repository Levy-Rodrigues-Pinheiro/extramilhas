import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CpmClassification = 'IMPERDIVEL' | 'BOA' | 'NORMAL';

// Hardcoded estimated miles table for reverse calculation (economy from GRU)
const ROUTE_TABLE: Record<
  string,
  { economy: number; business: number; first: number }
> = {
  'GRU-MIA': { economy: 40000, business: 80000, first: 100000 },
  'GRU-JFK': { economy: 45000, business: 90000, first: 120000 },
  'GRU-MCO': { economy: 40000, business: 80000, first: 100000 },
  'GRU-CUN': { economy: 30000, business: 60000, first: 80000 },
  'GRU-BOG': { economy: 20000, business: 40000, first: 60000 },
  'GRU-EZE': { economy: 12000, business: 25000, first: 40000 },
  'GRU-MVD': { economy: 12000, business: 25000, first: 40000 },
  'GRU-SCL': { economy: 12000, business: 25000, first: 40000 },
  'GRU-LIM': { economy: 18000, business: 36000, first: 55000 },
  'GRU-LHR': { economy: 55000, business: 110000, first: 150000 },
  'GRU-CDG': { economy: 55000, business: 110000, first: 150000 },
  'GRU-LIS': { economy: 45000, business: 90000, first: 130000 },
  'GRU-MAD': { economy: 50000, business: 100000, first: 140000 },
  'GRU-FCO': { economy: 55000, business: 110000, first: 150000 },
  'GRU-NRT': { economy: 70000, business: 140000, first: 200000 },
  'GRU-SYD': { economy: 75000, business: 150000, first: 210000 },
  'GRU-DXB': { economy: 60000, business: 120000, first: 170000 },
  'GRU-BKK': { economy: 65000, business: 130000, first: 180000 },
};

function classifyCpm(cpm: number): CpmClassification {
  if (cpm < 20) return 'IMPERDIVEL';
  if (cpm <= 30) return 'BOA';
  return 'NORMAL';
}

@Injectable()
export class CalculatorService {
  constructor(private prisma: PrismaService) {}

  async calculateCpm(amountBrl: number, milesQty: number) {
    const cpm = (amountBrl / milesQty) * 1000;
    const classification = classifyCpm(cpm);

    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      select: { slug: true, avgCpmCurrent: true },
      orderBy: { avgCpmCurrent: 'asc' },
    });

    const programAverages = programs.map((p) => ({
      slug: p.slug,
      avgCpm: Number(p.avgCpmCurrent),
    }));

    return {
      cpm: Math.round(cpm * 100) / 100,
      classification,
      programAverages,
    };
  }

  compareValue(milesRequired: number, cpmProgram: number, cashPriceBrl: number) {
    const milesValueBrl = (milesRequired / 1000) * cpmProgram;
    const savings = cashPriceBrl - milesValueBrl;
    const savingsPercent = cashPriceBrl > 0 ? (savings / cashPriceBrl) * 100 : 0;
    const recommendation = savingsPercent > 5 ? 'MILHAS' : savingsPercent < -5 ? 'DINHEIRO' : 'EQUIVALENTE';
    return {
      milesValueBrl: +milesValueBrl.toFixed(2),
      cashPriceBrl: +cashPriceBrl.toFixed(2),
      savings: +Math.abs(savings).toFixed(2),
      savingsPercent: +Math.abs(savingsPercent).toFixed(1),
      recommendation,
    };
  }

  async reverseCalculate(
    destination: string,
    flightClass: 'economy' | 'business' | 'first',
    programSlug?: string,
  ) {
    // Normalize destination key (try GRU-DEST format)
    const routeKey = destination.toUpperCase().startsWith('GRU-')
      ? destination.toUpperCase()
      : `GRU-${destination.toUpperCase()}`;

    const route = ROUTE_TABLE[routeKey];
    const milesRequired = route ? route[flightClass] : null;

    // Fetch program average CPM for BRL cost estimate
    let avgCpm: number | null = null;
    if (programSlug) {
      const program = await this.prisma.loyaltyProgram.findUnique({
        where: { slug: programSlug },
        select: { avgCpmCurrent: true },
      });
      if (program) {
        avgCpm = Number(program.avgCpmCurrent);
      }
    } else {
      const programs = await this.prisma.loyaltyProgram.findMany({
        where: { isActive: true },
        select: { avgCpmCurrent: true },
      });
      if (programs.length > 0) {
        const total = programs.reduce((sum, p) => sum + Number(p.avgCpmCurrent), 0);
        avgCpm = total / programs.length;
      }
    }

    const estimatedBrl =
      milesRequired !== null && avgCpm !== null
        ? Math.round((milesRequired / 1000) * avgCpm * 100) / 100
        : null;

    return {
      destination: routeKey,
      class: flightClass,
      milesRequired,
      estimatedBrl,
      avgCpmUsed: avgCpm ? Math.round(avgCpm * 100) / 100 : null,
      note:
        milesRequired === null
          ? 'Route not found in reference table. Provide a known IATA pair like GRU-MIA.'
          : undefined,
    };
  }
}
