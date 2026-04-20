import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AnalyticsService — envio de eventos server-side pro PostHog.
 *
 * Lógica: sem POSTHOG_API_KEY → no-op. Mesmo padrão do Sentry e Twilio.
 * Eventos server-side são valiosos pra:
 *  - Tracking de ações canônicas (bonus_report_approved, push_sent)
 *  - Métricas que o client não sabe (total_devices_notified)
 *  - Fonte de verdade quando o cliente não tá pra conferir
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: any = null;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('POSTHOG_API_KEY');
    const host =
      this.configService.get<string>('POSTHOG_HOST') || 'https://us.i.posthog.com';

    if (!key) {
      this.logger.log('PostHog key ausente — analytics em no-op mode');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PostHog } = require('posthog-node');
      this.client = new PostHog(key, { host });
      this.logger.log('PostHog server client initialized');
    } catch (err) {
      this.logger.warn(`PostHog SDK falhou: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.shutdown();
      } catch {}
    }
  }

  capture(event: string, distinctId: string | null, properties?: Record<string, any>) {
    if (!this.client) return;
    try {
      this.client.capture({
        distinctId: distinctId || `anon_${Date.now()}`,
        event,
        properties,
      });
    } catch (err) {
      this.logger.debug(`PostHog capture failed: ${(err as Error).message}`);
    }
  }

  identify(userId: string, properties?: Record<string, any>) {
    if (!this.client) return;
    try {
      this.client.identify({ distinctId: userId, properties });
    } catch {}
  }
}
