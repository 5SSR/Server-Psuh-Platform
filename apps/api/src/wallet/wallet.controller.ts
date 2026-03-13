import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
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

  // 开发期充值（仅测试用途）
  @Post('recharge')
  recharge(@CurrentUser() user: { userId: string }, @Body('amount') amount: number) {
    return this.walletService.recharge(user.userId, Number(amount) || 0);
  }
}
