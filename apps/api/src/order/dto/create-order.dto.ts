import { IsString } from 'class-validator';

// 买家创建订单
export class CreateOrderDto {
  @IsString()
  productId: string;
}
