import { Module } from '@nestjs/common';
import { PodcastController } from './podcast.controller';
import { PodcastService } from './podcast.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PodcastController],
  providers: [PodcastService],
})
export class PodcastModule {}
