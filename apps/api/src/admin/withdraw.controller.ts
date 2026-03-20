import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletService } from '../wallet/wallet.service';
import { QueryWithdrawDto } from '../wallet/dto/query-withdraw.dto';
import { ReviewWithdrawDto } from '../wallet/dto/review-withdraw.dto';

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminWithdrawController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  list(@Query() query: QueryWithdrawDto) {
    return this.walletService.listWithdrawalsForAdmin(query);
  }

  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: ReviewWithdrawDto
  ) {
    return this.walletService.reviewWithdrawal(id, user.userId, dto);
  }
}
