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

import { CreateWantedDto } from './dto/create-wanted.dto';
import { CreateWantedOfferDto } from './dto/create-wanted-offer.dto';
import { QueryWantedDto } from './dto/query-wanted.dto';
import { QueryWantedOfferDto } from './dto/query-wanted-offer.dto';
import { ReviewWantedOfferDto } from './dto/review-wanted-offer.dto';
import { WantedService } from './wanted.service';

@Controller('wanted')
export class WantedController {
  constructor(private readonly wantedService: WantedService) {}

  @Get('summary')
  summary() {
    return this.wantedService.getWantedSummary();
  }

  @Get()
  list(@Query() query: QueryWantedDto) {
    return this.wantedService.listWanted(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.wantedService.getWantedDetail(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateWantedDto) {
    return this.wantedService.createWanted(user.userId, dto);
  }

  @Get('mine/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  mine(@CurrentUser() user: { userId: string }, @Query() query: QueryWantedDto) {
    return this.wantedService.listMine(user.userId, query);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  close(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.wantedService.closeWanted(user.userId, id);
  }

  @Post(':id/offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  createOffer(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: CreateWantedOfferDto
  ) {
    return this.wantedService.createOffer(user.userId, id, dto);
  }

  @Get(':id/offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  offersForBuyer(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.wantedService.listOffersForBuyer(user.userId, id);
  }

  @Get('offers/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  offersForSeller(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryWantedOfferDto
  ) {
    return this.wantedService.listOffersForSeller(user.userId, query);
  }

  @Patch(':id/offers/:offerId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  reviewOffer(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() dto: ReviewWantedOfferDto
  ) {
    return this.wantedService.reviewOffer(user.userId, id, offerId, dto);
  }
}
