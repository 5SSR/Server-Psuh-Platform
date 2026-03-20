import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

import { OrderService } from '../order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { NoticeService } from '../../notice/notice.service';
import { RiskService } from '../../risk/risk.service';
import { PaymentRefundService } from '../../payment/payment-refund.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;
  let wallet: any;
  let noticeService: any;
  let riskService: any;
  let paymentRefundService: any;

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn() },
      order: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      feeConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      orderLog: { create: jest.fn(), findMany: jest.fn() },
      payment: { upsert: jest.fn() },
      settlement: { upsert: jest.fn(), findMany: jest.fn() },
      refund: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      dispute: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      disputeEvidence: { create: jest.fn() },
      $transaction: jest.fn((cb) => {
        if (typeof cb === 'function') return cb(prisma);
        return Promise.all(cb);
      })
    };

    wallet = {
      freezeEscrow: jest.fn(),
      releaseSettlement: jest.fn(),
      refundToBuyer: jest.fn(),
      refreshSellerProfileMetrics: jest.fn()
    };
    noticeService = {
      createSystemNotice: jest.fn()
    };
    riskService = {
      evaluate: jest.fn().mockResolvedValue({ action: 'ALLOW', reason: 'ok' })
    };
    paymentRefundService = {
      attemptRefund: jest.fn().mockResolvedValue({
        channel: 'ALIPAY',
        supported: true,
        success: true,
        mode: 'MOCK'
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: WalletService, useValue: wallet },
        { provide: NoticeService, useValue: noticeService },
        { provide: RiskService, useValue: riskService },
        { provide: PaymentRefundService, useValue: paymentRefundService }
      ]
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('create', () => {
    it('should throw if product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.create('user1', { productId: 'p1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw if buying own product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', salePrice: 100, sellerId: 'user1', title: 'Test' });
      await expect(service.create('user1', { productId: 'p1' })).rejects.toThrow(ForbiddenException);
    });

    it('should create order successfully', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', salePrice: 100, sellerId: 'seller1', title: 'Test' });
      prisma.order.create.mockResolvedValue({ id: 'o1', buyerId: 'user1', status: 'PENDING_PAYMENT' });
      const result = await service.create('user1', { productId: 'p1' });
      expect(result).toHaveProperty('id', 'o1');
    });
  });

  describe('cancelOrder', () => {
    it('should throw if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.cancelOrder('o1', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not buyer', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', buyerId: 'other', status: 'PENDING_PAYMENT' });
      await expect(service.cancelOrder('o1', 'user1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if status not PENDING_PAYMENT', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', buyerId: 'user1', status: 'PAID_WAITING_DELIVERY' });
      await expect(service.cancelOrder('o1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should cancel order successfully', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', buyerId: 'user1', status: 'PENDING_PAYMENT' });
      prisma.order.update.mockResolvedValue({});
      prisma.orderLog.create.mockResolvedValue({});
      const result = await service.cancelOrder('o1', 'user1');
      expect(result).toHaveProperty('message', '订单已取消');
    });
  });

  describe('forceComplete', () => {
    it('should throw if order already completed', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'COMPLETED' });
      await expect(service.forceComplete('o1', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should force complete order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', status: 'BUYER_CHECKING', sellerId: 's1', price: 100, fee: 0 });
      prisma.order.update.mockResolvedValue({});
      prisma.settlement.upsert.mockResolvedValue({});
      prisma.orderLog.create.mockResolvedValue({});
      const result = await service.forceComplete('o1', 'admin1');
      expect(result).toHaveProperty('message', '订单已强制完成');
    });
  });

  describe('orderTimeline', () => {
    it('should return timeline entries', async () => {
      prisma.orderLog.findMany.mockResolvedValue([{ id: '1', action: 'PAY' }]);
      const result = await service.orderTimeline('o1');
      expect(result).toHaveLength(1);
    });
  });
});
