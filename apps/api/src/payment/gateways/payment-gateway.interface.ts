import { PayChannel } from '@prisma/client';

export interface RemoteTransaction {
  orderId?: string;
  tradeNo?: string;
  thirdTradeNo?: string;
  amount: number;
  status: string;
  paidAt?: string;
}

export interface PaymentGateway {
  channel: PayChannel;
  fetchTransactions(bizDate: string): Promise<RemoteTransaction[]>;
}
