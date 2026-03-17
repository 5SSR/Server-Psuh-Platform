import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/user.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [ScheduleModule.forRoot(), OrderModule, UserModule, PaymentModule],
  providers: [TaskService]
})
export class TaskModule {}
