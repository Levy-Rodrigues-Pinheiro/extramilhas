import { Module } from '@nestjs/common';
import { SloController } from './slo.controller';
import { SloService } from './slo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SloController],
  providers: [SloService],
})
export class SloModule {}
