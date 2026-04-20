import { tierFor, nextTierThreshold, displayName } from './leaderboard.service';

/**
 * Leaderboard pure functions — tier math e anonimização.
 * Qualquer regressão aqui quebra o rank do app e o push personalizado.
 */
describe('leaderboard math', () => {
  describe('tierFor', () => {
    it.each([
      [0, 'BRONZE'],
      [1, 'BRONZE'],
      [2, 'BRONZE'],
      [3, 'SILVER'],
      [9, 'SILVER'],
      [10, 'GOLD'],
      [24, 'GOLD'],
      [25, 'PLATINUM'],
      [100, 'PLATINUM'],
    ])('approvedCount=%i → %s', (count, expected) => {
      expect(tierFor(count)).toBe(expected);
    });
  });

  describe('nextTierThreshold', () => {
    it('BRONZE next = 3 (SILVER entry)', () => {
      expect(nextTierThreshold('BRONZE')).toBe(3);
    });
    it('SILVER next = 10 (GOLD entry)', () => {
      expect(nextTierThreshold('SILVER')).toBe(10);
    });
    it('GOLD next = 25 (PLATINUM entry)', () => {
      expect(nextTierThreshold('GOLD')).toBe(25);
    });
    it('PLATINUM = null (topo)', () => {
      expect(nextTierThreshold('PLATINUM')).toBeNull();
    });
  });

  describe('displayName anonymization', () => {
    it('nome composto: "João Silva" → "João S."', () => {
      expect(displayName('João Silva')).toBe('João S.');
    });
    it('nome simples permanece', () => {
      expect(displayName('Maria')).toBe('Maria');
    });
    it('null/undefined → Anônimo', () => {
      expect(displayName(null)).toBe('Anônimo');
      expect(displayName(undefined)).toBe('Anônimo');
      expect(displayName('')).toBe('Anônimo');
    });
    it('3 partes pega primeira+última inicial', () => {
      expect(displayName('João da Silva')).toBe('João S.');
    });
    it('extra spaces tolerado', () => {
      expect(displayName('  Ana   Santos  ')).toBe('Ana S.');
    });
  });
});
