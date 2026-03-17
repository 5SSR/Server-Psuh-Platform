import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RiskService } from '../../risk/risk.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;
  let riskService: any;

  beforeEach(async () => {
    prisma = {
      wallet: {
        upsert: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      walletLedger: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      withdrawal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      settlement: {
        count: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      order: { findMany: jest.fn() },
      dispute: { count: jest.fn() },
      sellerProfile: { upsert: jest.fn() },
      user: { findUnique: jest.fn() },
      notice: { create: jest.fn() },
      $transaction: jest.fn((cb) => {
        if (typeof cb === 'function') return cb(prisma);
        return Promise.all(cb);
      }),
    };
    riskService = {
      evaluate: jest.fn().mockResolvedValue({ action: 'ALLOW', reason: 'ok' })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: RiskService, useValue: riskService }
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('getSummary', () => {
    it('should return wallet info', async () => {
      prisma.wallet.upsert.mockResolvedValue({
        id: 'w1', userId: 'u1', balance: new Prisma.Decimal(100), frozen: new Prisma.Decimal(0),
      });
      const result = await service.getSummary('u1');
      expect(result).toHaveProperty('id', 'w1');
      expect(result.balance).toEqual(new Prisma.Decimal(100));
    });
  });

  describe('getLedger', () => {
    it('should return paginated ledger', async () => {
      prisma.wallet.upsert.mockResolvedValue({ id: 'w1' });
      prisma.walletLedger.count.mockResolvedValue(5);
      prisma.walletLedger.findMany.mockResolvedValue([{ id: 'l1' }]);
      const result = await service.getLedger('u1', 1, 20);
      expect(result.total).toBe(5);
      expect(result.list).toHaveLength(1);
    });
  });

  describe('applyWithdrawal', () => {
    it('should throw if amount is below minimum', async () => {
      await expect(
        service.applyWithdrawal('u1', { amount: 1, channel: 'ALIPAY', accountInfo: '123' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if balance is insufficient', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BUYER', status: 'ACTIVE' });
      prisma.wallet.upsert.mockResolvedValue({
        id: 'w1', userId: 'u1', balance: new Prisma.Decimal(50), frozen: new Prisma.Decimal(0),
      });
      await expect(
        service.applyWithdrawal('u1', { amount: 200, channel: 'ALIPAY', accountInfo: '123' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create withdrawal successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BUYER', status: 'ACTIVE' });
      prisma.wallet.upsert.mockResolvedValue({
        id: 'w1', userId: 'u1', balance: new Prisma.Decimal(500), frozen: new Prisma.Decimal(0),
      });
      prisma.withdrawal.create.mockResolvedValue({ id: 'wd1', amount: new Prisma.Decimal(200), fee: new Prisma.Decimal(1.2) });
      prisma.wallet.update.mockResolvedValue({});
      prisma.walletLedger.create.mockResolvedValue({});
      prisma.notice.create.mockResolvedValue({});

      const result = await service.applyWithdrawal('u1', { amount: 200, channel: 'ALIPAY', accountInfo: '123' });
      expect(result).toHaveProperty('message');
      expect(result.withdrawal).toHaveProperty('id', 'wd1');
    });
  });

  describe('refreshSellerProfileMetrics', () => {
    it('should calculate and upsert seller profile', async () => {
      prisma.settlement.count.mockResolvedValue(10);
      prisma.dispute.count.mockResolvedValue(1);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.sellerProfile.upsert.mockResolvedValue({ userId: 's1', level: 2 });

      const result = await service.refreshSellerProfileMetrics('s1');
      expect(result).toHaveProperty('level', 2);
    });
  });

  describe('reviewWithdrawal', () => {
    it('should throw if withdrawal not found', async () => {
      prisma.withdrawal.findUnique.mockResolvedValue(null);
      await expect(
        service.reviewWithdrawal('wd1', 'admin1', { action: 'APPROVED' as any })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recharge', () => {
    it('should recharge wallet balance', async () => {
      prisma.wallet.upsert.mockResolvedValue({
        id: 'w1', userId: 'u1', balance: new Prisma.Decimal(0), frozen: new Prisma.Decimal(0),
      });
      prisma.wallet.update.mockResolvedValue({});
      prisma.walletLedger.create.mockResolvedValue({});
      prisma.wallet.findUnique.mockResolvedValue({
        id: 'w1', balance: new Prisma.Decimal(100), frozen: new Prisma.Decimal(0),
      });

      const result = await service.recharge('u1', 100);
      expect(result).toHaveProperty('id', 'w1');
    });
  });
});
