import { Module } from '@nestjs/common';

import { NoticeModule } from '../notice/notice.module';

import { AdminConsignmentController } from './admin-consignment.controller';
import { ConsignmentController } from './consignment.controller';
import { ConsignmentService } from './consignment.service';

@Module({
  imports: [NoticeModule],
  controllers: [ConsignmentController, AdminConsignmentController],
  providers: [ConsignmentService],
  exports: [ConsignmentService]
})
export class ConsignmentModule {}
