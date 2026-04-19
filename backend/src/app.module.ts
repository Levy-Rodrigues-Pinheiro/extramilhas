import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OffersModule } from './offers/offers.module';
import { AlertsModule } from './alerts/alerts.module';
import { ProgramsModule } from './programs/programs.module';
import { CalculatorModule } from './calculator/calculator.module';
import { SimulatorModule } from './simulator/simulator.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ContentModule } from './content/content.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { TransfersModule } from './transfers/transfers.module';
import { HealthModule } from './health/health.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        // Em dev usa pino-pretty (humano). Em prod JSON (ingere fácil no Loki/Logtail/CloudWatch).
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  ignore: 'pid,hostname,req,res,responseTime',
                  messageFormat: '[{context}] {msg}',
                },
              },
        // Gera/propaga request ID — permite rastrear requests cross-service no futuro
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) ||
          (req.headers['x-correlation-id'] as string) ||
          randomUUID(),
        customProps: () => ({ app: 'milhasextras-backend' }),
        // Rotas sem ruído — health check não precisa poluir log
        autoLogging: {
          ignore: (req) => {
            const url = (req.url || '') as string;
            return url === '/api/v1/health' || url === '/health';
          },
        },
        // Redact de campos sensíveis (defense-in-depth)
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-scraper-secret"]',
            'req.body.password',
            'req.body.accessToken',
            'req.body.refreshToken',
          ],
          censor: '[REDACTED]',
        },
        level: process.env.LOG_LEVEL || 'info',
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 1000)),
        },
      }),
    }),
    CacheModule.register({ isGlobal: true, ttl: 60 }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OffersModule,
    AlertsModule,
    ProgramsModule,
    CalculatorModule,
    SimulatorModule,
    SubscriptionModule,
    ContentModule,
    NotificationsModule,
    AdminModule,
    TransfersModule,
    HealthModule,
    ArbitrageModule,
  ],
})
export class AppModule {}
