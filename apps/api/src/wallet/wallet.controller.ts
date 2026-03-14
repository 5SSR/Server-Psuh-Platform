import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApplyWithdrawDto } from './dto/apply-withdraw.dto';
import { QueryWithdrawDto } from './dto/query-withdraw.dto';
import { QuerySettlementDto } from './dto/query-settlement.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  summary(@CurrentUser() user: { userId: string }) {
    return this.walletService.getSummary(user.userId);
  }

  @Get('ledger')
  ledger(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ) {
    return this.walletService.getLedger(user.userId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Get('withdrawals')
  withdrawals(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryWithdrawDto
  ) {
    return this.walletService.listWithdrawals(user.userId, query);
  }

  @Get('settlements')
  @Roles('SELLER')
  settlements(
    @CurrentUser() user: { userId: string },
    @Query() query: QuerySettlementDto
  ) {
    return this.walletService.listSettlementsForSeller(user.userId, query);
  }

  @Post('withdrawals')
  @Roles('SELLER')
  applyWithdrawal(
    @CurrentUser() user: { userId: string },
    @Body() dto: ApplyWithdrawDto
  ) {
    return this.walletService.applyWithdrawal(user.userId, dto);
  }

  // 开发期充值（仅测试用途）
  @Post('recharge')
  recharge(@CurrentUser() user: { userId: string }, @Body('amount') amount: number) {
    return this.walletService.recharge(user.userId, Number(amount) || 0);
  }
}
