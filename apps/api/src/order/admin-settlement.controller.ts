import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminSettlementDto } from './dto/admin-settlement.dto';

@Controller('admin/settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSettlementController {
  constructor(private readonly walletService: WalletService) {}

  // 管理员放款
  @Patch(':orderId/release')
  @Roles('ADMIN')
  release(@Param('orderId') orderId: string, @Body() _dto: AdminSettlementDto) {
    return this.walletService.releaseSettlement(orderId);
  }
}
