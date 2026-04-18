import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
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
  ],
})
export class AppModule {}
