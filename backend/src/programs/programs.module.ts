import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { PublicCpmController } from './public-cpm.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProgramsController, PublicCpmController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
