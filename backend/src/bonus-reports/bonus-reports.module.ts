import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { BonusReportsController } from './bonus-reports.controller';

@Module({
  imports: [
    PrismaModule,
    PushModule,
    LeaderboardModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [BonusReportsController],
})
export class BonusReportsModule {}
