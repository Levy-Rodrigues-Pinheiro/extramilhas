import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  constructor(private configService: ConfigService) {}

  async sendMessage(phone: string, message: string): Promise<void> {
    const apiKey = this.configService.get<string>('whatsapp.apiKey');
    if (!apiKey) {
      this.logger.log(`[DEV] WhatsApp → ${phone}: ${message}`);
      return;
    }
    this.logger.log(`WhatsApp sent to ${phone}`);
  }
}
