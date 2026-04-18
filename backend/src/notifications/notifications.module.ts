import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, WhatsAppService],
  exports: [NotificationsService, WhatsAppService],
})
export class NotificationsModule {}
