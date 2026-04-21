import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentModule } from '../content/content.module';
import { PushModule } from '../push/push.module';
import { SimulatorModule } from '../simulator/simulator.module';

@Module({
  imports: [
    NotificationsModule,
    ContentModule,
    PushModule,
    SimulatorModule,
    JwtModule.register({}), // usa secret dinâmico via ConfigService em cada signAsync
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
