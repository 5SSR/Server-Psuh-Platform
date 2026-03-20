import { PayChannel } from '@prisma/client';

export interface RemoteTransaction {
  orderId?: string;
  tradeNo?: string;
  thirdTradeNo?: string;
  amount: number;
  status: string;
  paidAt?: string;
}

export interface RefundRequest {
  orderId: string;
  amount: number;
  currency?: string;
  tradeNo?: string;
  thirdTradeNo?: string;
  reason?: string;
  operatorId?: string;
}

export interface RefundResult {
  success: boolean;
  channelRefundNo?: string;
  message?: string;
  raw?: unknown;
}

export interface PaymentGateway {
  channel: PayChannel;
  fetchTransactions(bizDate: string): Promise<RemoteTransaction[]>;
  refundTransaction?(request: RefundRequest): Promise<RefundResult>;
}
