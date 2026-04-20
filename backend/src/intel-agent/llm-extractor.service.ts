import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ExtractedBonus {
  fromProgramSlug: string; // normalized: livelo, esfera, itau, bradesco, sicredi
  toProgramSlug: string;   // smiles, latampass, tudoazul, azul
  bonusPercent: number;
  expiresAt: string | null; // ISO date
  notes: string;            // quote curta de onde saiu
}

export interface ExtractionResult {
  bonuses: ExtractedBonus[];
  costUsd: number;
  modelUsed: string;
}

/**
 * LlmExtractor — usa Claude Haiku (barato + rápido) pra parsear HTML/texto
 * e estruturar bônus de transferência. Função pura: recebe texto, retorna
 * array validado.
 *
 * Custo: ~$0.001-0.003 por chamada. Pré-filtro local reduz ~80% dos calls
 * (se o texto nem menciona "bônus" ou "%", nem manda).
 *
 * Sem ANTHROPIC_API_KEY → retorna [] silenciosamente (modo dev/no-op).
 */
@Injectable()
export class LlmExtractor {
  private readonly logger = new Logger(LlmExtractor.name);
  private client: any = null;
  private readonly model = 'claude-haiku-4-5';

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!key) {
      this.logger.log('ANTHROPIC_API_KEY ausente — LlmExtractor em no-op');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Anthropic = require('@anthropic-ai/sdk').default;
      this.client = new Anthropic({ apiKey: key });
    } catch (err) {
      this.logger.warn(`Anthropic SDK falhou: ${(err as Error).message}`);
    }
  }

  /**
   * Pré-filtro barato: só chama LLM se o texto tem indicadores de bônus.
   * Evita queimar tokens em páginas sem nada relevante.
   */
  hasRelevantKeywords(text: string): boolean {
    const t = text.toLowerCase();
    const hasBonusMention =
      t.includes('bônus') || t.includes('bonus') || t.includes('bonificaç');
    const hasTransferMention =
      t.includes('transfer') || t.includes('pontos') || t.includes('milhas');
    const hasProgramMention =
      /livelo|esfera|smiles|latam[\s-]?pass|tudoazul|azul|itaú|itau|bradesco/i.test(t);
    const hasPercent = /\d{2,3}\s*%/.test(t);

    return hasBonusMention && hasTransferMention && hasProgramMention && hasPercent;
  }

  async extract(text: string): Promise<ExtractionResult> {
    if (!this.client) {
      return { bonuses: [], costUsd: 0, modelUsed: 'noop' };
    }

    // Trunca texto pra evitar stinging cost em páginas gigantes
    const truncated = text.slice(0, 50_000);

    const systemPrompt = `Você é um extrator de bônus de transferência de pontos/milhas brasileiros. Recebe texto de uma página (blog ou site oficial) e extrai SÓ bônus ATIVOS mencionados como ofertas concretas. Retorna JSON array — sem prosa, sem markdown.

Formato de cada item:
{
  "fromProgramSlug": "livelo|esfera|itau|bradesco|sicredi",
  "toProgramSlug": "smiles|latampass|tudoazul|azul",
  "bonusPercent": 100,
  "expiresAt": "2026-12-31" ou null,
  "notes": "citação curta de onde saiu (máx 150 chars)"
}

REGRAS CRÍTICAS:
- Ignore menções históricas ("o bônus de 100% costuma acontecer")
- Ignore vagos ("bônus altos"): só números concretos
- Nunca invente programa que não está explícito no texto
- Se "2x pontos" ou "dobro", bonusPercent = 100. Se "3x" → 200, etc.
- Se não achou nada concreto, retorne []
- Slugs SEMPRE em lowercase do conjunto definido acima
- Se extrair múltiplos bônus da mesma promo, retorne um por par from→to
- Datas de expiração: só se explícitas (formato "válido até 31/12/2026" etc.)

Retorne APENAS o JSON array, começando com [ e terminando com ]. Nada mais.`;

    try {
      const start = Date.now();
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: truncated }],
      });
      const latency = Date.now() - start;

      const content = res.content?.[0]?.text || '[]';
      // Claude às vezes embrulha em ```json ```
      const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        this.logger.warn(`JSON parse failed. Raw: ${content.slice(0, 200)}`);
        parsed = [];
      }
      const bonuses = Array.isArray(parsed) ? parsed.filter((b) => this.isValid(b)) : [];

      // Cost estimate (Haiku pricing Oct/2024: $0.25/M input, $1.25/M output)
      const inputTokens = res.usage?.input_tokens ?? 0;
      const outputTokens = res.usage?.output_tokens ?? 0;
      const costUsd = (inputTokens / 1_000_000) * 0.25 + (outputTokens / 1_000_000) * 1.25;

      this.logger.log(
        `LLM extract: ${bonuses.length} bonuses, ${inputTokens}in/${outputTokens}out tokens, $${costUsd.toFixed(4)}, ${latency}ms`,
      );
      return { bonuses, costUsd, modelUsed: this.model };
    } catch (err) {
      this.logger.error(`LLM extract failed: ${(err as Error).message}`);
      return { bonuses: [], costUsd: 0, modelUsed: this.model };
    }
  }

  private isValid(b: any): boolean {
    const validFromSlugs = ['livelo', 'esfera', 'itau', 'bradesco', 'sicredi'];
    const validToSlugs = ['smiles', 'latampass', 'tudoazul', 'azul'];
    if (!validFromSlugs.includes(b?.fromProgramSlug)) return false;
    if (!validToSlugs.includes(b?.toProgramSlug)) return false;
    if (typeof b?.bonusPercent !== 'number' || b.bonusPercent < 1 || b.bonusPercent > 500) {
      return false;
    }
    if (b.expiresAt && !/^\d{4}-\d{2}-\d{2}/.test(b.expiresAt)) return false;
    return true;
  }
}
