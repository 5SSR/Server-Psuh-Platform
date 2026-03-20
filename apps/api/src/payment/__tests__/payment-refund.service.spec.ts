import { PayChannel } from '@prisma/client';

import { PaymentRefundService } from '../payment-refund.service';

describe('PaymentRefundService', () => {
  let service: PaymentRefundService;
  let prisma: any;
  let alipayGateway: any;
  let wechatGateway: any;
  let usdtGateway: any;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn()
      },
      paymentEvent: {
        create: jest.fn().mockResolvedValue({})
      }
    };

    alipayGateway = {
      channel: PayChannel.ALIPAY,
      refundTransaction: jest.fn().mockResolvedValue({ success: true, channelRefundNo: 'RF-1' })
    };
    wechatGateway = {
      channel: PayChannel.WECHAT,
      refundTransaction: jest.fn().mockResolvedValue({ success: true, channelRefundNo: 'RF-2' })
    };
    usdtGateway = {
      channel: PayChannel.USDT,
      refundTransaction: jest.fn().mockResolvedValue({ success: true, channelRefundNo: 'RF-3' })
    };

    service = new PaymentRefundService(
      prisma,
      alipayGateway,
      wechatGateway,
      usdtGateway
    );
  });

  afterEach(() => {
    delete process.env.PAY_GATEWAY_ALIPAY_MODE;
  });

  it('should default to disabled mode when channel mode is not configured', async () => {
    delete process.env.PAY_GATEWAY_ALIPAY_MODE;
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      payChannel: PayChannel.ALIPAY,
      escrowAmount: 100,
      payment: {
        id: 'pay-1',
        channel: PayChannel.ALIPAY,
        tradeNo: 'trade-1',
        thirdTradeNo: null,
        amount: 100,
        paidAmount: 100,
        currency: 'CNY'
      }
    });

    const result = await service.attemptRefund('o1');

    expect(result).toEqual(
      expect.objectContaining({
        channel: PayChannel.ALIPAY,
        mode: 'DISABLED',
        supported: true,
        success: false,
        reason: 'CHANNEL_DISABLED'
      })
    );
    expect(alipayGateway.refundTransaction).not.toHaveBeenCalled();
  });
});
