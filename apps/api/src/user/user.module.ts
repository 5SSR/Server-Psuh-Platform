import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { SellerDashboardController } from './seller-dashboard.controller';
import { UserInteractionController } from './user-interaction.controller';
import { UserInteractionService } from './user-interaction.service';

@Module({
  controllers: [UserController, SellerDashboardController, UserInteractionController],
  providers: [UserInteractionService],
  exports: [UserInteractionService]
})
export class UserModule {}
