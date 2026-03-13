import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from '../order/order.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly orderService: OrderService) {}

  // 每 5 分钟关闭超时未支付订单
  @Cron(CronExpression.EVERY_5_MINUTES)
  async closeUnpaid() {
    const res = await this.orderService.cancelUnpaid(
      this.orderService.cancelTimeoutMinutes
    );
    if (res.canceled > 0) {
      this.logger.log(`自动取消未支付订单 ${res.canceled} 条`);
    }
  }

  // 每 5 分钟处理验机超时自动确认
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoConfirm() {
    const res = await this.orderService.autoConfirmTimeout();
    if (res.confirmed > 0) {
      this.logger.log(`自动确认订单 ${res.confirmed} 条`);
    }
  }

  // 每 10 分钟尝试放款待结算订单
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoRelease() {
    const res = await this.orderService.autoReleaseSettlements();
    if (res.released > 0) {
      this.logger.log(`自动放款订单 ${res.released} 条`);
    }
  }
}
