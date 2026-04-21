import { Module } from '@nestjs/common';
import { WalletPassController } from './wallet-pass.controller';
import { WalletPassService } from './wallet-pass.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WalletPassController],
  providers: [WalletPassService],
})
export class WalletPassModule {}
