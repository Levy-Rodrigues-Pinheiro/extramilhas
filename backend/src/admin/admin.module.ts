import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentModule } from '../content/content.module';

@Module({
  imports: [NotificationsModule, ContentModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
