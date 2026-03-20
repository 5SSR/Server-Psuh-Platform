import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BargainService } from '../bargain/bargain.service';
import { AdminBatchReviewBargainDto } from '../bargain/dto/admin-batch-review-bargain.dto';
import { AdminQueryBargainDto } from '../bargain/dto/admin-query-bargain.dto';
import { AdminReviewBargainDto } from '../bargain/dto/admin-review-bargain.dto';

@Controller('admin/bargains')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBargainController {
  constructor(private readonly bargainService: BargainService) {}

  @Get()
  list(@Query() query: AdminQueryBargainDto) {
    return this.bargainService.listForAdmin(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.bargainService.getDetailForAdmin(id);
  }

  @Patch(':id/review')
  review(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: AdminReviewBargainDto
  ) {
    return this.bargainService.reviewByAdmin(user.userId, id, dto);
  }

  @Patch('review/batch')
  reviewBatch(
    @CurrentUser() user: { userId: string },
    @Body() dto: AdminBatchReviewBargainDto
  ) {
    return this.bargainService.reviewBatchByAdmin(user.userId, dto);
  }
}
