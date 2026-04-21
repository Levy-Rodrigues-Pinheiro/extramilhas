import { Module } from '@nestjs/common';
import { MentorshipController } from './mentorship.controller';
import { MentorshipService } from './mentorship.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MentorshipController],
  providers: [MentorshipService],
})
export class MentorshipModule {}
