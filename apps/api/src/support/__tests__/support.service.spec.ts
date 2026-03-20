import { BadRequestException } from '@nestjs/common';

import { SupportService } from '../support.service';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn()
      },
      product: {
        findUnique: jest.fn()
      },
      supportTicket: {
        create: jest.fn().mockResolvedValue({ id: 'ticket-1' })
      }
    };

    service = new SupportService(prisma);
  });

  it('should reject ticket creation when dto.productId mismatches order productId', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      buyerId: 'u1',
      sellerId: 'u2',
      productId: 'p-order'
    });

    await expect(
      service.create('u1', {
        orderId: 'o1',
        productId: 'p-other',
        subject: '测试工单',
        content: '这是一个用于测试的工单内容'
      } as any)
    ).rejects.toThrow(BadRequestException);

    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
  });

  it('should persist order productId when creating order-linked ticket', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      buyerId: 'u1',
      sellerId: 'u2',
      productId: 'p-order'
    });

    await service.create('u1', {
      orderId: 'o1',
      subject: '测试工单',
      content: '这是一个用于测试的工单内容'
    } as any);

    expect(prisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'o1',
          productId: 'p-order'
        })
      })
    );
  });
});
