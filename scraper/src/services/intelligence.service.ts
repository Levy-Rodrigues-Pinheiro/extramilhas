export class IntelligenceService {

  /** Classify a deal quality based on miles and route */
  static classifyDeal(miles: number, origin: string, dest: string, cabin: string): {
    quality: 'EXCELENTE' | 'BOM' | 'REGULAR' | 'CARO';
    reason: string;
  } {
    // Reference miles for common routes (economy, one-way)
    const REFERENCE: Record<string, number> = {
      // South America
      'GRU-EZE': 15000, 'GRU-SCL': 20000, 'GRU-LIM': 25000, 'GRU-BOG': 25000,
      // North America
      'GRU-MIA': 50000, 'GRU-JFK': 55000, 'GRU-MCO': 50000, 'GRU-LAX': 60000,
      // Europe
      'GRU-LIS': 70000, 'GRU-MAD': 75000, 'GRU-CDG': 80000, 'GRU-LHR': 80000,
      // Asia/Oceania
      'GRU-DXB': 100000, 'GRU-NRT': 110000, 'GRU-SYD': 120000,
    };

    const cabinMultiplier = cabin === 'business' ? 2.5 : cabin === 'first' ? 4 : 1;
    const routeKey = `${origin}-${dest}`;
    const reference = (REFERENCE[routeKey] || 60000) * cabinMultiplier;

    const ratio = miles / reference;

    if (ratio <= 0.7) return { quality: 'EXCELENTE', reason: `${Math.round((1 - ratio) * 100)}% abaixo da média` };
    if (ratio <= 0.9) return { quality: 'BOM', reason: `${Math.round((1 - ratio) * 100)}% abaixo da média` };
    if (ratio <= 1.15) return { quality: 'REGULAR', reason: 'Próximo da média de mercado' };
    return { quality: 'CARO', reason: `${Math.round((ratio - 1) * 100)}% acima da média` };
  }

  /** Generate a summary recommendation */
  static generateSummary(flights: any[]): string {
    if (flights.length === 0) return 'Nenhum voo encontrado para esta rota.';

    const cheapest = flights[0];
    const programs = [...new Set(flights.map((f: any) => f.programName))];

    return `Encontramos ${flights.length} opção(ões) em ${programs.length} programa(s). ` +
      `A melhor é ${cheapest.programName} com ${cheapest.milesRequired?.toLocaleString('pt-BR')} milhas` +
      (cheapest.taxBrl > 0 ? ` + R$${cheapest.taxBrl.toFixed(2)} de taxa` : '') + '.';
  }
}
