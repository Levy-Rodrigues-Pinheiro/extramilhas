import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TelegramAdapter — lê últimas N mensagens de canais públicos do Telegram
 * via Bot API. Usado como IntelSource do tipo "telegram".
 *
 * IMPORTANTE: Telegram Bot API só dá acesso a canais onde o bot foi
 * ADICIONADO como administrador (ou é membro de grupo). Pra canais públicos
 * sem nosso bot, precisamos usar scraping via t.me/s/<channel> (HTML público).
 *
 * Estratégia aqui: preview HTML público `https://t.me/s/<channel>` funciona
 * sem auth e mostra últimas ~15 mensagens. Mesma pipeline do adapter HTML
 * então reaproveita LlmExtractor pra extrair bônus.
 *
 * Uso: admin cria IntelSource com sourceType='telegram' e url='telegram:pontosmais'
 * (prefixo "telegram:" + nome do canal sem @).
 */
@Injectable()
export class TelegramAdapter {
  private readonly logger = new Logger(TelegramAdapter.name);
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(private configService: ConfigService) {}

  /**
   * Resolve url "telegram:pontosmais" → "https://t.me/s/pontosmais"
   * Retorna null se formato inválido.
   */
  static resolveUrl(sourceUrl: string): string | null {
    if (!sourceUrl.startsWith('telegram:')) return null;
    const handle = sourceUrl.slice('telegram:'.length).trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(handle)) return null;
    return `https://t.me/s/${handle}`;
  }

  /**
   * Fetch previews do canal e concatena o texto das últimas mensagens.
   * Retorna texto plano pronto pra LLM extractor.
   */
  async fetchChannelText(channelHandle: string): Promise<string> {
    const url = `https://t.me/s/${channelHandle}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; MilhasExtrasBot/1.0; +https://milhasextras.com.br/bot)',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      // Extrai só o conteúdo de .tgme_widget_message_text (classe preview
      // do Telegram) — reduz ruído pra ~10% do tamanho.
      const matches = html.match(
        /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      );
      if (!matches) return '';
      const messages = matches.map((m) =>
        m
          .replace(/<[^>]+>/g, ' ') // strip tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim(),
      );
      // Últimas 20 mensagens, newline entre elas
      return messages.slice(-20).join('\n---\n');
    } finally {
      clearTimeout(timer);
    }
  }
}
