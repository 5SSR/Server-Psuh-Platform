import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NoticeService } from '../notice/notice.service';
import { AdminQueryNoticeDto } from '../notice/dto/admin-query-notice.dto';
import { CreateAdminNoticeDto } from '../notice/dto/create-admin-notice.dto';
import { CreateTemplateDto, UpdateTemplateDto } from '../notice/dto/template.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/notices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminNoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  list(@Query() query: AdminQueryNoticeDto) {
    return this.noticeService.listForAdmin(query);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateAdminNoticeDto
  ) {
    return this.noticeService.createByAdmin(user.userId, dto);
  }

  // ---- Template CRUD ----
  @Get('templates')
  listTemplates(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.noticeService.listTemplates({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.noticeService.createTemplate(dto);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.noticeService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.noticeService.deleteTemplate(id);
  }
}
