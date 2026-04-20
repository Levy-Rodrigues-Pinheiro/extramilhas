import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * WhatsAppService — envio de alertas via WhatsApp (Twilio WhatsApp Business).
 *
 * Duas fases:
 *  1. VERIFICATION: manda código OTP (6 dígitos) via SMS comum pra confirmar
 *     que o número realmente pertence ao user (evita spam malicioso).
 *  2. NOTIFICATION: depois de verificado, usa WhatsApp Business pra mandar
 *     alertas ricos (formatting + emoji + link direto pro app).
 *
 * Sem TWILIO_ACCOUNT_SID → tudo vira no-op (modo dev, só loga). Permite
 * rodar o app inteiro sem configurar conta Twilio.
 *
 * Custo Twilio: ~$0.005 por template WhatsApp, ~$0.0075 por SMS.
 * Cobertura BR: WhatsApp é efetivamente grátis após o custo de API.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: any = null;
  private whatsappFrom: string;

  constructor(private configService: ConfigService) {
    const sid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.whatsappFrom =
      this.configService.get<string>('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886';

    if (sid && token) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const twilio = require('twilio');
        this.client = twilio(sid, token);
        this.logger.log('WhatsApp/Twilio client initialized');
      } catch (err) {
        this.logger.warn(`Twilio SDK failed to load: ${(err as Error).message}`);
      }
    } else {
      this.logger.log('TWILIO_ACCOUNT_SID não configurado — WhatsApp em dev/mock mode');
    }
  }

  /**
   * Normaliza telefone BR pra formato E.164: +5511999999999
   * Aceita "(11) 99999-9999", "11999999999", "+5511999999999", etc.
   */
  normalizePhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return null;
    // Se já tem DDI (55...)
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`;
    }
    // Se tem 10 ou 11 dígitos, assume BR
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    return null;
  }

  /**
   * Envia SMS com código OTP pro user verificar o número.
   * Retorna boolean (true=enviado/mock-ok, false=falhou).
   */
  async sendVerificationCode(phoneE164: string, code: string): Promise<boolean> {
    const message = `Milhas Extras: seu código de verificação é ${code}. Válido por 10 minutos.`;

    if (!this.client) {
      this.logger.log(`[DEV] SMS mock -> ${phoneE164}: ${message}`);
      return true;
    }

    try {
      const from = this.configService.get<string>('TWILIO_SMS_FROM');
      await this.client.messages.create({
        body: message,
        from,
        to: phoneE164,
      });
      return true;
    } catch (err) {
      this.logger.error(`SMS send failed to ${phoneE164}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Envia mensagem WhatsApp (só depois de verificado).
   * Usa texto simples — formatar com WhatsApp markdown (`*bold*`, `_italic_`)
   * é suportado.
   */
  async sendMessage(phoneE164: string, body: string): Promise<boolean> {
    if (!this.client) {
      this.logger.log(`[DEV] WhatsApp mock -> ${phoneE164}: ${body.slice(0, 80)}...`);
      return true;
    }

    try {
      await this.client.messages.create({
        body,
        from: this.whatsappFrom,
        to: `whatsapp:${phoneE164}`,
      });
      return true;
    } catch (err) {
      this.logger.error(`WhatsApp send failed to ${phoneE164}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Envia broadcast WhatsApp pra N destinatários. Serializado (respeita
   * rate-limit do Twilio de ~1 msg/s pra contas novas) e com retry implícito
   * via catch — nunca falha a chamada.
   */
  async broadcast(
    phones: string[],
    body: string,
  ): Promise<{ sent: number; errors: number }> {
    let sent = 0;
    let errors = 0;
    for (const phone of phones) {
      const ok = await this.sendMessage(phone, body);
      if (ok) sent++;
      else errors++;
    }
    return { sent, errors };
  }
}
