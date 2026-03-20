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

import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { QuerySupportTicketDto } from './dto/query-support-ticket.dto';
import { AdminQuerySupportTicketDto } from './dto/admin-query-support-ticket.dto';
import { ReviewSupportTicketDto } from './dto/review-support-ticket.dto';
import { SupportService } from './support.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('support/tickets')
  @Roles('USER')
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSupportTicketDto
  ) {
    return this.supportService.create(user.userId, dto);
  }

  @Get('support/tickets')
  @Roles('USER')
  listMine(
    @CurrentUser() user: { userId: string },
    @Query() query: QuerySupportTicketDto
  ) {
    return this.supportService.listMine(user.userId, query);
  }

  @Get('support/tickets/:id')
  @Roles('USER')
  detailMine(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.supportService.detailMine(user.userId, id);
  }

  @Patch('support/tickets/:id/close')
  @Roles('USER')
  closeMine(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.supportService.closeMine(user.userId, id);
  }

  @Get('admin/support/tickets')
  @Roles('ADMIN')
  listAdmin(@Query() query: AdminQuerySupportTicketDto) {
    return this.supportService.listAdmin(query);
  }

  @Patch('admin/support/tickets/:id/review')
  @Roles('ADMIN')
  reviewAdmin(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ReviewSupportTicketDto
  ) {
    return this.supportService.reviewAdmin(user.userId, id, dto);
  }
}
