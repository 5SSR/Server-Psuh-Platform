import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { PayChannel } from '@prisma/client';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentService } from '../payment/payment.service';

import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { DeliverDto } from './dto/deliver.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { CreateOrderReviewDto } from './dto/create-order-review.dto';



@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService
  ) {}

  @Post()
  @Roles('USER')
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user.userId, dto);
  }

  @Get()
  list(
    @CurrentUser() user: { userId: string; role: string },
    @Query('as') as: 'buyer' | 'seller' = 'buyer'
  ) {
    const role = as === 'seller' ? 'seller' : 'buyer';
    return this.orderService.listMine(user.userId, role);
  }

  @Patch(':id/pay')
  @Roles('USER')
  pay(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: PayOrderDto
  ) {
    if (dto.channel === PayChannel.BALANCE) {
      return this.orderService.pay(id, user.userId, dto);
    }
    // 非余额渠道走支付模块生成支付意图，等待回调
    return this.paymentService.initiatePayment(id, user.userId, dto);
  }

  @Patch(':id/deliver')
  @Roles('USER')
  deliver(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: DeliverDto
  ) {
    return this.orderService.deliver(id, user.userId, dto);
  }

  @Patch(':id/confirm')
  @Roles('USER')
  confirm(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ConfirmDto
  ) {
    return this.orderService.buyerConfirm(id, user.userId, dto);
  }

  @Patch(':id/cancel')
  @Roles('USER')
  cancel(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.orderService.cancelOrder(id, user.userId);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.orderService.orderTimeline(id);
  }

  @Get(':id/review')
  getReview(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.orderService.getOrderReview(id, user.userId);
  }

  @Post(':id/review')
  @Roles('USER')
  review(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: CreateOrderReviewDto
  ) {
    return this.orderService.submitOrderReview(id, user.userId, dto);
  }
}
