import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { StoreService } from './store.service';
import { UpsertStoreProfileDto } from './dto/upsert-store-profile.dto';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('slug/:slug')
  publicBySlug(@Param('slug') slug: string) {
    return this.storeService.publicBySlug(slug);
  }

  @Get('seller/:sellerId')
  publicBySeller(@Param('sellerId') sellerId: string) {
    return this.storeService.publicByUserId(sellerId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: { userId: string }) {
    return this.storeService.mine(user.userId);
  }

  @Patch('mine')
  @UseGuards(JwtAuthGuard)
  upsertMine(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpsertStoreProfileDto
  ) {
    return this.storeService.upsertMine(user.userId, dto);
  }
}

