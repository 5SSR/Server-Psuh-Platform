import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { ContentService } from './content.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';
import { CreateMarketTagDto } from './dto/create-market-tag.dto';
import { UpdateMarketTagDto } from './dto/update-market-tag.dto';
import { ContentReleaseNoteDto } from './dto/content-release-note.dto';
import { CreatePolicyDocumentDto } from './dto/create-policy-document.dto';
import { UpdatePolicyDocumentDto } from './dto/update-policy-document.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller('admin/content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('releases')
  listReleases() {
    return this.contentService.listReleases();
  }

  @Post('publish')
  publishContent(
    @CurrentUser() user: { userId: string },
    @Body() dto: ContentReleaseNoteDto
  ) {
    return this.contentService.publishCurrentContent(user.userId, dto.note);
  }

  @Post('releases/:id/rollback')
  rollbackToRelease(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ContentReleaseNoteDto
  ) {
    return this.contentService.rollbackToRelease(user.userId, id, dto.note);
  }

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

  @Get('policies')
  listPolicyDocuments() {
    return this.contentService.listPolicyDocuments(false);
  }

  @Post('policies')
  createPolicyDocument(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreatePolicyDocumentDto
  ) {
    return this.contentService.createPolicyDocument(dto, user.userId);
  }

  @Patch('policies/:id')
  updatePolicyDocument(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdatePolicyDocumentDto
  ) {
    return this.contentService.updatePolicyDocument(id, dto, user.userId);
  }

  @Delete('policies/:id')
  deletePolicyDocument(@Param('id') id: string) {
    return this.contentService.deletePolicyDocument(id);
  }

  @Get('announcements')
  listAnnouncements() {
    return this.contentService.listAnnouncements(false, 100);
  }

  @Post('announcements')
  createAnnouncement(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateAnnouncementDto
  ) {
    return this.contentService.createAnnouncement(dto, user.userId);
  }

  @Patch('announcements/:id')
  updateAnnouncement(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto
  ) {
    return this.contentService.updateAnnouncement(id, dto, user.userId);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@Param('id') id: string) {
    return this.contentService.deleteAnnouncement(id);
  }
}
