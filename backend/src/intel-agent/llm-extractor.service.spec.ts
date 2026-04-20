import { ConfigService } from '@nestjs/config';
import { LlmExtractor } from './llm-extractor.service';

/**
 * LlmExtractor — teste do pré-filtro de keywords. Se esse regride,
 * começamos a queimar tokens Claude em pages sem nada relevante.
 * Sem API key → modo no-op. Aqui só testa hasRelevantKeywords + no-op.
 */
describe('LlmExtractor', () => {
  let extractor: LlmExtractor;

  beforeEach(() => {
    const configStub = {
      get: () => undefined, // sem API key → no-op
    } as unknown as ConfigService;
    extractor = new LlmExtractor(configStub);
  });

  describe('hasRelevantKeywords', () => {
    it('texto rico em bônus + programa + % → true', () => {
      const html =
        'Promoção Livelo agora: transferência com 100% de bônus pra Smiles! Válido até 30/11.';
      expect(extractor.hasRelevantKeywords(html)).toBe(true);
    });

    it('texto sem %: falso', () => {
      const html = 'Livelo está com bônus de transferência pra Smiles nessa semana!';
      expect(extractor.hasRelevantKeywords(html)).toBe(false);
    });

    it('texto sem bônus word: falso', () => {
      const html =
        'Transferência Livelo Smiles com multiplicador de 100%. Preço pontos.';
      expect(extractor.hasRelevantKeywords(html)).toBe(false);
    });

    it('texto sem programa conhecido: falso', () => {
      const html = 'Bônus de transferência de pontos com 80% para programa obscuro.';
      expect(extractor.hasRelevantKeywords(html)).toBe(false);
    });

    it('case insensitive', () => {
      const html = 'LIVELO com BÔNUS de 50% de TRANSFERÊNCIA pra SMILES';
      expect(extractor.hasRelevantKeywords(html)).toBe(true);
    });
  });

  describe('extract em no-op mode', () => {
    it('sem API key retorna array vazio + cost 0', async () => {
      const result = await extractor.extract('qualquer texto');
      expect(result.bonuses).toEqual([]);
      expect(result.costUsd).toBe(0);
      expect(result.modelUsed).toBe('noop');
    });
  });
});
