import { Module } from '@nestjs/common';

import { NoticeModule } from '../notice/notice.module';

import { WantedController } from './wanted.controller';
import { WantedService } from './wanted.service';

@Module({
  imports: [NoticeModule],
  controllers: [WantedController],
  providers: [WantedService],
  exports: [WantedService]
})
export class WantedModule {}
