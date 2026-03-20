import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/user.module';
import { PaymentModule } from '../payment/payment.module';
import { BargainModule } from '../bargain/bargain.module';
import { RiskModule } from '../risk/risk.module';

import { TaskService } from './task.service';

@Module({
  imports: [ScheduleModule.forRoot(), OrderModule, UserModule, PaymentModule, BargainModule, RiskModule],
  providers: [TaskService]
})
export class TaskModule {}
