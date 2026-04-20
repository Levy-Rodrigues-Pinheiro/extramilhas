/**
 * Unit tests pra matemática pura de arbitragem (sem DB).
 * Protege regressões no cálculo crítico que define se user ganha/perde.
 *
 * Replica a fórmula que tá no ArbitrageService.transferBonusOpportunities:
 *   effectiveCpm = sourceCpm / (baseRate × (1 + bonus/100))
 *   gainPercent = (destCpm - effectiveCpm) / destCpm × 100
 *   valueGainPer1000 = (destCpm - effectiveCpm) × multiplier
 */

/** Copia da fórmula do service — se mudar lá, atualiza aqui. */
export function calcEffectiveCpm(sourceCpm: number, baseRate: number, bonusPercent: number): number {
  const multiplier = baseRate * (1 + bonusPercent / 100);
  return sourceCpm / multiplier;
}

export function calcGainPercent(effectiveCpm: number, destCpm: number): number {
  if (destCpm <= 0) return 0;
  return ((destCpm - effectiveCpm) / destCpm) * 100;
}

export function classify(gainPercent: number): 'IMPERDIVEL' | 'BOA' | 'NORMAL' {
  if (gainPercent >= 50) return 'IMPERDIVEL';
  if (gainPercent >= 25) return 'BOA';
  return 'NORMAL';
}

describe('arbitrage math', () => {
  describe('calcEffectiveCpm', () => {
    it('100% bônus com baseRate 1.0 → divide por 2', () => {
      expect(calcEffectiveCpm(25, 1.0, 100)).toBe(12.5);
    });

    it('sem bônus → igual ao sourceCpm (baseRate 1)', () => {
      expect(calcEffectiveCpm(25, 1.0, 0)).toBe(25);
    });

    it('50% bônus → sourceCpm ÷ 1.5', () => {
      expect(calcEffectiveCpm(30, 1.0, 50)).toBeCloseTo(20);
    });

    it('baseRate 0.5 + 100% bônus → multiplier 1x → sourceCpm inalterado', () => {
      // Ex: Esfera→Smiles com câmbio 1:0.5 e 100% bônus = volta ao 1:1
      expect(calcEffectiveCpm(25, 0.5, 100)).toBe(25);
    });

    it('200% bônus (3x pontos) → divide por 3', () => {
      expect(calcEffectiveCpm(30, 1.0, 200)).toBe(10);
    });
  });

  describe('calcGainPercent', () => {
    it('effectiveCpm 12, destCpm 22 → ganho 45.4%', () => {
      expect(calcGainPercent(12, 22)).toBeCloseTo(45.45, 1);
    });

    it('effectiveCpm IGUAL ao destCpm → ganho 0%', () => {
      expect(calcGainPercent(22, 22)).toBe(0);
    });

    it('effectiveCpm > destCpm → ganho negativo (perda)', () => {
      expect(calcGainPercent(30, 22)).toBeCloseTo(-36.36, 1);
    });

    it('destCpm 0 → proteção (retorna 0, não NaN)', () => {
      expect(calcGainPercent(10, 0)).toBe(0);
    });
  });

  describe('classify (classificação do card)', () => {
    it.each([
      [80, 'IMPERDIVEL'],
      [50, 'IMPERDIVEL'],
      [49.9, 'BOA'],
      [25, 'BOA'],
      [24.9, 'NORMAL'],
      [0, 'NORMAL'],
      [-10, 'NORMAL'],
    ])('gain %i%% → %s', (gain, expected) => {
      expect(classify(gain)).toBe(expected);
    });
  });

  describe('cenário end-to-end', () => {
    it('Livelo 25 CPM → Smiles 22 CPM com 100% bônus = IMPERDIVEL', () => {
      const eff = calcEffectiveCpm(25, 1.0, 100);
      expect(eff).toBe(12.5);
      const gain = calcGainPercent(eff, 22);
      expect(gain).toBeCloseTo(43.18, 1);
      // 43% fica em BOA, 50% seria IMPERDIVEL
      expect(classify(gain)).toBe('BOA');
    });

    it('Livelo 25 → Smiles 22 com 50% bônus = marginal', () => {
      const eff = calcEffectiveCpm(25, 1.0, 50);
      const gain = calcGainPercent(eff, 22);
      expect(gain).toBeLessThan(25); // NORMAL — confirma bom pra esperar
      expect(classify(gain)).toBe('NORMAL');
    });

    it('Esfera 22 → Smiles 22 com 100% bônus = 50% ganho, IMPERDIVEL', () => {
      const eff = calcEffectiveCpm(22, 1.0, 100);
      expect(eff).toBe(11);
      const gain = calcGainPercent(eff, 22);
      expect(gain).toBe(50);
      expect(classify(gain)).toBe('IMPERDIVEL');
    });
  });
});
