import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from '../reconciliation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PayChannel } from '@prisma/client';
import { AlipayGateway } from '../gateways/alipay.gateway';
import { WechatGateway } from '../gateways/wechat.gateway';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prisma: any;
  let alipay: any;
  let wechat: any;

  beforeEach(async () => {
    prisma = {
      reconcileTask: {
        upsert: jest.fn().mockResolvedValue({ id: 't1' }),
        update: jest.fn().mockResolvedValue({})
      },
      reconcileItem: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({})
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([])
      },
      $transaction: jest.fn((cb) => cb(prisma))
    };

    alipay = { channel: PayChannel.ALIPAY, fetchTransactions: jest.fn().mockResolvedValue([]) };
    wechat = { channel: PayChannel.WECHAT, fetchTransactions: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AlipayGateway, useValue: alipay },
        { provide: WechatGateway, useValue: wechat }
      ]
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  it('should run reconciliation and return summary', async () => {
    const result = await service.run(PayChannel.ALIPAY, '2026-03-18');
    expect(result.taskId).toBe('t1');
    expect(result.diffCount).toBe(0);
    expect(alipay.fetchTransactions).toHaveBeenCalled();
  });
});
