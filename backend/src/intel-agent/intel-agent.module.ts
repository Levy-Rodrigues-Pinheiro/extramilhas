import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { IntelAgentController } from './intel-agent.controller';
import { IntelAgentService } from './intel-agent.service';
import { LlmExtractor } from './llm-extractor.service';
import { TelegramAdapter } from './telegram-adapter.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [IntelAgentController],
  providers: [IntelAgentService, LlmExtractor, TelegramAdapter],
  exports: [IntelAgentService],
})
export class IntelAgentModule {}
