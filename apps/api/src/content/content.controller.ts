import { Controller, Get } from '@nestjs/common';

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
}
