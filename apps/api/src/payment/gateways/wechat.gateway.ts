import { Injectable, Logger } from '@nestjs/common';
import { PayChannel } from '@prisma/client';
import { PaymentGateway, RemoteTransaction } from './payment-gateway.interface';

@Injectable()
export class WechatGateway implements PaymentGateway {
  readonly channel = PayChannel.WECHAT;
  private readonly logger = new Logger(WechatGateway.name);

  async fetchTransactions(_bizDate: string): Promise<RemoteTransaction[]> {
    // Real integration requires production merchant credentials.
    if (!process.env.WECHAT_RECONCILE_API) {
      this.logger.warn('WECHAT_RECONCILE_API 未配置，返回空账单');
      return [];
    }
    return [];
  }
}
