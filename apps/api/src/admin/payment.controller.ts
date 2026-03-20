import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentService } from '../payment/payment.service';
import { QueryPaymentDto } from '../payment/dto/query-payment.dto';
import { ReviewPaymentDto } from '../payment/dto/review-payment.dto';
import { UpdateOrderFeeConfigDto } from '../payment/dto/update-order-fee-config.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  list(@Query() query: QueryPaymentDto) {
    return this.paymentService.listForAdmin(query);
  }

  @Get('integrations')
  integrations() {
    return this.paymentService.getPaymentIntegrations();
  }

  @Get('diagnostics')
  diagnostics() {
    return this.paymentService.getPaymentDiagnosticsReport();
  }

  @Patch(':orderId/review')
  review(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: ReviewPaymentDto
  ) {
    return this.paymentService.reviewPayment(orderId, user.userId, dto);
  }

  @Get('fee-config')
  getFeeConfig() {
    return this.paymentService.getOrderFeeConfig();
  }

  @Patch('fee-config')
  updateFeeConfig(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateOrderFeeConfigDto
  ) {
    return this.paymentService.updateOrderFeeConfig(user.userId, dto);
  }
}
