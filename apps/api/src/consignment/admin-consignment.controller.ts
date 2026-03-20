import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { ConsignmentService } from './consignment.service';
import { QueryConsignmentDto } from './dto/query-consignment.dto';
import { ReviewConsignmentDto } from './dto/review-consignment.dto';

@Controller('admin/consignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminConsignmentController {
  constructor(private readonly consignmentService: ConsignmentService) {}

  @Get()
  list(@Query() query: QueryConsignmentDto) {
    return this.consignmentService.listForAdmin(query);
  }

  @Patch(':id/review')
  review(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ReviewConsignmentDto
  ) {
    return this.consignmentService.reviewByAdmin(user.userId, id, dto);
  }
}
