import { Global, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/**
 * Global pra evitar import em cada module. Tem 1 service stateless
 * com um client singleton — custo zero.
 */
@Global()
@Module({
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
