import { Module } from '@nestjs/common';

import { NoticeModule } from '../notice/notice.module';
import { OrderModule } from '../order/order.module';

import { BargainController } from './bargain.controller';
import { BargainService } from './bargain.service';

@Module({
  imports: [NoticeModule, OrderModule],
  controllers: [BargainController],
  providers: [BargainService],
  exports: [BargainService]
})
export class BargainModule {}
