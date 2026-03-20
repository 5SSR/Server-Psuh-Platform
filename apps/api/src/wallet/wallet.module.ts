import { Module } from '@nestjs/common';

import { RiskModule } from '../risk/risk.module';
import { NoticeModule } from '../notice/notice.module';

import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [RiskModule, NoticeModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService]
})
export class WalletModule {}
