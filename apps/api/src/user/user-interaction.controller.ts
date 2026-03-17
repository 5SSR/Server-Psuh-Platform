import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Body,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserInteractionService } from './user-interaction.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserInteractionController {
  constructor(private readonly interactionService: UserInteractionService) {}

  // ---- Favorites ----
  @Get('favorites')
  listFavorites(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.interactionService.listFavorites(user.userId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
  }

  @Post('favorites/:productId')
  addFavorite(
    @CurrentUser() user: { userId: string },
    @Param('productId') productId: string
  ) {
    return this.interactionService.addFavorite(user.userId, productId);
  }

  @Delete('favorites/:productId')
  removeFavorite(
    @CurrentUser() user: { userId: string },
    @Param('productId') productId: string
  ) {
    return this.interactionService.removeFavorite(user.userId, productId);
  }

  // ---- Browsing History ----
  @Get('history')
  listHistory(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.interactionService.listHistory(user.userId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
  }

  @Delete('history')
  clearHistory(@CurrentUser() user: { userId: string }) {
    return this.interactionService.clearHistory(user.userId);
  }

  // ---- Price Alerts ----
  @Get('price-alerts')
  listAlerts(@CurrentUser() user: { userId: string }) {
    return this.interactionService.listAlerts(user.userId);
  }

  @Post('price-alerts')
  createAlert(
    @CurrentUser() user: { userId: string },
    @Body() body: { productId: string; targetPrice: number }
  ) {
    return this.interactionService.createAlert(user.userId, body.productId, body.targetPrice);
  }

  @Delete('price-alerts/:id')
  deleteAlert(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string
  ) {
    return this.interactionService.deleteAlert(user.userId, id);
  }
}
