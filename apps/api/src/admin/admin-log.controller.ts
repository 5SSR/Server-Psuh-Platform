import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { AdminLogService } from './admin-log.service';

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminLogController {
  constructor(private readonly adminLogService: AdminLogService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('adminId') adminId?: string,
    @Query('resource') resource?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.adminLogService.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      action,
      adminId,
      resource,
      keyword
    });
  }
}
