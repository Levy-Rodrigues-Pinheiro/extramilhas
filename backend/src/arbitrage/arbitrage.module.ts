import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArbitrageController } from './arbitrage.controller';
import { ArbitrageService } from './arbitrage.service';

@Module({
  imports: [PrismaModule],
  controllers: [ArbitrageController],
  providers: [ArbitrageService],
})
export class ArbitrageModule {}
