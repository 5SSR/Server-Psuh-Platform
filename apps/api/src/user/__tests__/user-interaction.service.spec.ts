import { Test, TestingModule } from '@nestjs/testing';
import { UserInteractionService } from '../user-interaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UserInteractionService', () => {
  let service: UserInteractionService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn() },
      favorite: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      browsingHistory: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      priceAlert: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => {
        if (typeof cb === 'function') return cb(prisma);
        return Promise.all(cb);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInteractionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UserInteractionService>(UserInteractionService);
  });

  describe('addFavorite', () => {
    it('should throw if already favorited', async () => {
      prisma.favorite.findUnique.mockResolvedValue({ id: 'f1' });
      await expect(service.addFavorite('u1', 'p1')).rejects.toThrow(ConflictException);
    });

    it('should add favorite successfully', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.favorite.create.mockResolvedValue({ id: 'f1', userId: 'u1', productId: 'p1' });
      const result = await service.addFavorite('u1', 'p1');
      expect(result).toHaveProperty('id', 'f1');
    });
  });

  describe('removeFavorite', () => {
    it('should remove favorite', async () => {
      prisma.favorite.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.removeFavorite('u1', 'p1');
      expect(result).toHaveProperty('message', '已取消收藏');
    });
  });

  describe('listFavorites', () => {
    it('should return paginated favorites', async () => {
      prisma.favorite.count.mockResolvedValue(1);
      prisma.favorite.findMany.mockResolvedValue([{ id: 'f1', product: { title: 'Test' } }]);
      const result = await service.listFavorites('u1', { page: 1, pageSize: 20 });
      expect(result.total).toBe(1);
      expect(result.list).toHaveLength(1);
    });
  });

  describe('recordView', () => {
    it('should upsert browsing history', async () => {
      prisma.browsingHistory.upsert.mockResolvedValue({ id: 'bh1' });
      await service.recordView('u1', 'p1');
      expect(prisma.browsingHistory.upsert).toHaveBeenCalled();
    });
  });

  describe('listHistory', () => {
    it('should return paginated history', async () => {
      prisma.browsingHistory.count.mockResolvedValue(5);
      prisma.browsingHistory.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.listHistory('u1', { page: 1, pageSize: 20 });
      expect(result.total).toBe(5);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history for user', async () => {
      prisma.browsingHistory.deleteMany.mockResolvedValue({ count: 3 });
      const result = await service.clearHistory('u1');
      expect(result).toHaveProperty('message', '浏览记录已清空');
    });
  });

  describe('createAlert', () => {
    it('should create price alert', async () => {
      prisma.priceAlert.create.mockResolvedValue({ id: 'pa1' });
      const result = await service.createAlert('u1', 'p1', 100);
      expect(result).toHaveProperty('id', 'pa1');
    });
  });

  describe('deleteAlert', () => {
    it('should throw if not own alert', async () => {
      prisma.priceAlert.findUnique.mockResolvedValue({ id: 'pa1', userId: 'other' });
      await expect(service.deleteAlert('u1', 'pa1')).rejects.toThrow(NotFoundException);
    });

    it('should delete own alert', async () => {
      prisma.priceAlert.findUnique.mockResolvedValue({ id: 'pa1', userId: 'u1' });
      prisma.priceAlert.delete.mockResolvedValue({});
      const result = await service.deleteAlert('u1', 'pa1');
      expect(result).toHaveProperty('message', '提醒已删除');
    });
  });
});
