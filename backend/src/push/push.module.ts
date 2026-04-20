import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationPreferencesController } from './preferences.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [PushController, NotificationPreferencesController],
  providers: [PushService, WhatsAppService],
  exports: [PushService, WhatsAppService],
})
export class PushModule {}
