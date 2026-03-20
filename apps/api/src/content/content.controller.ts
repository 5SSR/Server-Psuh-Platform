import { Controller, Get, Param, Query } from '@nestjs/common';

import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('home')
  home() {
    return this.contentService.getHomeContent();
  }

  @Get('banners')
  listBanners() {
    return this.contentService.listBanners();
  }

  @Get('faqs')
  listFaqs() {
    return this.contentService.listFaqs();
  }

  @Get('help')
  listHelp() {
    return this.contentService.listHelpArticles();
  }

  @Get('tags')
  listTags() {
    return this.contentService.listMarketTags();
  }

  @Get('policies')
  listPolicies() {
    return this.contentService.listPolicyDocuments(true);
  }

  @Get('policies/:code')
  getPolicyByCode(@Param('code') code: string) {
    return this.contentService.getPolicyByCode(code);
  }

  @Get('announcements')
  listAnnouncements(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.contentService.listAnnouncements(true, Number.isFinite(parsed) ? parsed : 20);
  }

  @Get('announcements/:id')
  getAnnouncementById(@Param('id') id: string) {
    return this.contentService.getAnnouncementById(id, true);
  }
}
