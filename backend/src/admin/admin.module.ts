import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentModule } from '../content/content.module';
import { PushModule } from '../push/push.module';
import { SimulatorModule } from '../simulator/simulator.module';

@Module({
  imports: [NotificationsModule, ContentModule, PushModule, SimulatorModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
