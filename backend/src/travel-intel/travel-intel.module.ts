import { Module } from '@nestjs/common';
import { TravelIntelController } from './travel-intel.controller';
import { TravelIntelService } from './travel-intel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TravelIntelController],
  providers: [TravelIntelService],
})
export class TravelIntelModule {}
