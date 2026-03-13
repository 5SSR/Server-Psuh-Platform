import { OrderStatus } from '@prisma/client';

describe('OrderStatus enum', () => {
  it('should contain buyer checking state', () => {
    expect(OrderStatus.BUYER_CHECKING).toBeDefined();
  });
});
