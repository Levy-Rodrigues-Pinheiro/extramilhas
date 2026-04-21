import { Module } from '@nestjs/common';
import { CreditCardsController } from './credit-cards.controller';
import { CreditCardsService } from './credit-cards.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditCardsController],
  providers: [CreditCardsService],
})
export class CreditCardsModule {}
