import { Module } from '@nestjs/common';
import { TripPlansController } from './trip-plans.controller';
import { TripPlansService } from './trip-plans.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TripPlansController],
  providers: [TripPlansService],
})
export class TripPlansModule {}
