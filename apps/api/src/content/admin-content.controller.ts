import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { ContentService } from './content.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';
import { CreateMarketTagDto } from './dto/create-market-tag.dto';
import { UpdateMarketTagDto } from './dto/update-market-tag.dto';

@Controller('admin/content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('banners')
  listBanners() {
    return this.contentService.listBanners();
  }

  @Post('banners')
  createBanner(@Body() dto: CreateBannerDto) {
    return this.contentService.createBanner(dto);
  }

  @Patch('banners/:id')
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.contentService.updateBanner(id, dto);
  }

  @Delete('banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.contentService.deleteBanner(id);
  }

  @Get('faqs')
  listFaqs() {
    return this.contentService.listFaqs();
  }

  @Post('faqs')
  createFaq(@Body() dto: CreateFaqDto) {
    return this.contentService.createFaq(dto);
  }

  @Patch('faqs/:id')
  updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.contentService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  deleteFaq(@Param('id') id: string) {
    return this.contentService.deleteFaq(id);
  }

  @Get('helps')
  listHelpArticles() {
    return this.contentService.listHelpArticles();
  }

  @Post('helps')
  createHelpArticle(@Body() dto: CreateHelpArticleDto) {
    return this.contentService.createHelpArticle(dto);
  }

  @Patch('helps/:id')
  updateHelpArticle(@Param('id') id: string, @Body() dto: UpdateHelpArticleDto) {
    return this.contentService.updateHelpArticle(id, dto);
  }

  @Delete('helps/:id')
  deleteHelpArticle(@Param('id') id: string) {
    return this.contentService.deleteHelpArticle(id);
  }

  @Get('tags')
  listMarketTags() {
    return this.contentService.listMarketTags();
  }

  @Post('tags')
  createMarketTag(@Body() dto: CreateMarketTagDto) {
    return this.contentService.createMarketTag(dto);
  }

  @Patch('tags/:id')
  updateMarketTag(@Param('id') id: string, @Body() dto: UpdateMarketTagDto) {
    return this.contentService.updateMarketTag(id, dto);
  }

  @Delete('tags/:id')
  deleteMarketTag(@Param('id') id: string) {
    return this.contentService.deleteMarketTag(id);
  }
}
