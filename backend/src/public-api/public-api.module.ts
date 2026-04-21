import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicApiController],
  providers: [PublicApiService],
})
export class PublicApiModule {}
