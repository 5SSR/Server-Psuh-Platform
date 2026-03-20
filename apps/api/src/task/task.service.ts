import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayChannel } from '@prisma/client';

import { OrderService } from '../order/order.service';
import { UserInteractionService } from '../user/user-interaction.service';
import { ReconciliationService } from '../payment/reconciliation.service';
import { BargainService } from '../bargain/bargain.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  private readonly riskWatchlistWindowHours = Number(
    process.env.RISK_WATCHLIST_WINDOW_HOURS ?? 24
  );
  private readonly riskWatchlistScoreThreshold = Number(
    process.env.RISK_WATCHLIST_SCORE_THRESHOLD ?? 12
  );

  constructor(
    private readonly orderService: OrderService,
    private readonly userInteractionService: UserInteractionService,
    private readonly reconciliationService: ReconciliationService,
    private readonly bargainService: BargainService,
    private readonly riskService: RiskService
  ) {}

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

  // 每 10 分钟提醒已支付但未交付的订单
  @Cron(CronExpression.EVERY_10_MINUTES)
  async remindDelivery() {
    const res = await this.orderService.remindSellerDelivery(
      this.orderService.deliveryReminderMinutes,
      this.orderService.deliveryReminderCooldownMinutes
    );
    if (res.reminded > 0) {
      this.logger.log(`已提醒卖家交付 ${res.reminded} 条`);
    }
  }

  // 每 30 分钟检查降价提醒
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkPriceAlerts() {
    const res = await this.userInteractionService.checkPriceAlerts();
    if (res.triggered > 0) {
      this.logger.log(`触发降价提醒 ${res.triggered} 条`);
    }
  }

  // 每小时扫描高风险议价会话并提醒双方
  @Cron(CronExpression.EVERY_HOUR)
  async remindHighRiskBargains() {
    const res = await this.bargainService.remindHighRiskBargains(
      this.bargainService.riskReminderHours,
      this.bargainService.riskReminderCooldownHours
    );
    if (res.reminded > 0) {
      this.logger.log(`已提醒高风险议价会话 ${res.reminded} 条`);
    }
  }

  // 每 2 小时自动关闭长期无推进的议价会话
  @Cron('0 0 */2 * * *')
  async autoCloseStaleBargains() {
    const res = await this.bargainService.autoCloseStaleBargains(
      this.bargainService.autoCloseHours
    );
    if (res.closed > 0) {
      this.logger.log(`系统自动关闭议价会话 ${res.closed} 条`);
    }
  }

  // 每小时按命中记录自动同步风险观察名单
  @Cron('0 30 * * * *')
  async syncRiskWatchlist() {
    const res = await this.riskService.syncAutoWatchlist({
      windowHours: this.riskWatchlistWindowHours,
      thresholdScore: this.riskWatchlistScoreThreshold
    });
    if (res.activated > 0 || res.disabled > 0) {
      this.logger.log(
        `风险观察名单同步：新增/刷新 ${res.activated}，自动停用 ${res.disabled}，窗口 ${res.windowHours}h，阈值 ${res.thresholdScore}`
      );
    }
  }

  // 每天凌晨执行第三方支付对账（示例：T+1）
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async reconcileDaily() {
    const bizDate = new Date(Date.now() - 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    for (const channel of [PayChannel.ALIPAY, PayChannel.WECHAT, PayChannel.USDT]) {
      try {
        const result = await this.reconciliationService.run(channel, bizDate);
        this.logger.log(
          `[reconcile] ${channel} ${bizDate} diff=${result.diffCount}`
        );
      } catch (error: any) {
        this.logger.error(
          `[reconcile] ${channel} ${bizDate} failed: ${error?.message || 'unknown'}`
        );
      }
    }
  }
}
