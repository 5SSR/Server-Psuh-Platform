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
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { DeliverDto } from './dto/deliver.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard as Guard } from '../common/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(Guard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles('BUYER')
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
  @Roles('BUYER')
  pay(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: PayOrderDto
  ) {
    return this.orderService.pay(id, user.userId, dto);
  }

  @Patch(':id/deliver')
  @Roles('SELLER')
  deliver(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: DeliverDto
  ) {
    return this.orderService.deliver(id, user.userId, dto);
  }

  @Patch(':id/confirm')
  @Roles('BUYER')
  confirm(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ConfirmDto
  ) {
    return this.orderService.buyerConfirm(id, user.userId, dto);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string) {
    return this.orderService.orderTimeline(id);
  }
}
