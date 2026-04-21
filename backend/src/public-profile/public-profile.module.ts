import { Module } from '@nestjs/common';
import { PublicProfileController } from './public-profile.controller';
import { PublicProfileService } from './public-profile.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicProfileController],
  providers: [PublicProfileService],
})
export class PublicProfileModule {}
