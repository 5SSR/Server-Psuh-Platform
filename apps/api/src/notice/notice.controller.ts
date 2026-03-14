import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoticeService } from './notice.service';
import { QueryNoticeDto } from './dto/query-notice.dto';

@Controller('notices')
@UseGuards(JwtAuthGuard)
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryNoticeDto
  ) {
    return this.noticeService.listMine(user.userId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { userId: string }) {
    return this.noticeService.unreadCount(user.userId);
  }

  @Patch('read-all')
  readAll(@CurrentUser() user: { userId: string }) {
    return this.noticeService.markAllRead(user.userId);
  }

  @Patch(':id/read')
  read(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.noticeService.markRead(user.userId, id);
  }
}
