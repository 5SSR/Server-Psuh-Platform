import { Module } from '@nestjs/common';

import { NoticeModule } from '../notice/notice.module';

import { UserController } from './user.controller';
import { SellerDashboardController } from './seller-dashboard.controller';
import { UserInteractionController } from './user-interaction.controller';
import { UserInteractionService } from './user-interaction.service';

@Module({
  imports: [NoticeModule],
  controllers: [UserController, SellerDashboardController, UserInteractionController],
  providers: [UserInteractionService],
  exports: [UserInteractionService]
})
export class UserModule {}
