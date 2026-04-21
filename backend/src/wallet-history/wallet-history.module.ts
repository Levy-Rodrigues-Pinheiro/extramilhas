import { Module } from '@nestjs/common';
import { WalletHistoryController } from './wallet-history.controller';
import { WalletHistoryService } from './wallet-history.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WalletHistoryController],
  providers: [WalletHistoryService],
  exports: [WalletHistoryService],
})
export class WalletHistoryModule {}
