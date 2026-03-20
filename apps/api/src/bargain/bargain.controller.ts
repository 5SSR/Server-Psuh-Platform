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

import { ActBargainDto } from './dto/act-bargain.dto';
import { CreateBargainDto } from './dto/create-bargain.dto';
import { QueryBargainDto } from './dto/query-bargain.dto';
import { BargainService } from './bargain.service';

@Controller('bargains')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER')
export class BargainController {
  constructor(private readonly bargainService: BargainService) {}

  @Post('start')
  start(@CurrentUser() user: { userId: string }, @Body() dto: CreateBargainDto) {
    return this.bargainService.start(user.userId, dto);
  }

  @Get('mine')
  mine(@CurrentUser() user: { userId: string }, @Query() query: QueryBargainDto) {
    return this.bargainService.listMine(user.userId, query);
  }

  @Get(':id')
  detail(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.bargainService.getDetail(user.userId, id);
  }

  @Patch(':id/action')
  action(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ActBargainDto
  ) {
    return this.bargainService.act(user.userId, id, dto);
  }
}
