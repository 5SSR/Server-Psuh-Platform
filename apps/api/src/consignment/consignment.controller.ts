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

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { ConsignmentService } from './consignment.service';
import { CreateConsignmentDto } from './dto/create-consignment.dto';
import { QueryConsignmentDto } from './dto/query-consignment.dto';

@Controller('consignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsignmentController {
  constructor(private readonly consignmentService: ConsignmentService) {}

  @Post()
  @Roles('USER')
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateConsignmentDto
  ) {
    return this.consignmentService.createBySeller(user.userId, dto);
  }

  @Get('mine')
  @Roles('USER')
  listMine(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryConsignmentDto
  ) {
    return this.consignmentService.listMine(user.userId, query);
  }

  @Patch(':id/cancel')
  @Roles('USER')
  cancel(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.consignmentService.cancelBySeller(user.userId, id);
  }
}
