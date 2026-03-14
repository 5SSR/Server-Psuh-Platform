import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { SellerDashboardController } from './seller-dashboard.controller';

@Module({
  controllers: [UserController, SellerDashboardController]
})
export class UserModule {}
