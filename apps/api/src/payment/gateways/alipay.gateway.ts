import { Injectable, Logger } from '@nestjs/common';
import { PayChannel } from '@prisma/client';
import { PaymentGateway, RemoteTransaction } from './payment-gateway.interface';

@Injectable()
export class AlipayGateway implements PaymentGateway {
  readonly channel = PayChannel.ALIPAY;
  private readonly logger = new Logger(AlipayGateway.name);

  async fetchTransactions(_bizDate: string): Promise<RemoteTransaction[]> {
    // Real integration requires production merchant credentials.
    if (!process.env.ALIPAY_RECONCILE_API) {
      this.logger.warn('ALIPAY_RECONCILE_API 未配置，返回空账单');
      return [];
    }
    return [];
  }
}
