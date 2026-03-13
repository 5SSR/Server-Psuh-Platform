import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [ScheduleModule.forRoot(), OrderModule],
  providers: [TaskService]
})
export class TaskModule {}
