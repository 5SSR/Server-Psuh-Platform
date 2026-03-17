import { Test, TestingModule } from '@nestjs/testing';
import { RiskService } from '../risk.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskAction, RiskScene } from '@prisma/client';

describe('RiskService', () => {
  let service: RiskService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      riskEntityList: { findFirst: jest.fn() },
      riskRule: { findMany: jest.fn() },
      riskHit: { create: jest.fn() }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        { provide: PrismaService, useValue: prisma }
      ]
    }).compile();

    service = module.get<RiskService>(RiskService);
  });

  it('should allow when no rule matched', async () => {
    prisma.riskEntityList.findFirst.mockResolvedValue(null);
    prisma.riskRule.findMany.mockResolvedValue([]);

    const result = await service.evaluate(RiskScene.LOGIN, { userId: 'u1', ip: '1.1.1.1' });
    expect(result.action).toBe(RiskAction.ALLOW);
  });

  it('should block when blacklist hit', async () => {
    prisma.riskEntityList.findFirst.mockResolvedValue({ id: 'b1' });

    const result = await service.evaluate(RiskScene.LOGIN, { userId: 'u1', ip: '1.1.1.1' });
    expect(result.action).toBe(RiskAction.BLOCK);
    expect(prisma.riskHit.create).toHaveBeenCalled();
  });

  it('should match threshold rule', async () => {
    prisma.riskEntityList.findFirst.mockResolvedValue(null);
    prisma.riskRule.findMany.mockResolvedValue([
      {
        id: 'r1',
        code: 'WD_5000',
        action: RiskAction.REVIEW,
        reason: '大额提现',
        condition: { field: 'amount', op: 'gt', value: 5000 }
      }
    ]);

    const result = await service.evaluate(RiskScene.WITHDRAW, { userId: 'u1', amount: 8000 });
    expect(result.action).toBe(RiskAction.REVIEW);
    expect(result.matchedRules).toEqual(['WD_5000']);
  });
});
