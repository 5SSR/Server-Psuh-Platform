import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { ProductService } from './product.service';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SubmitProductDto } from './dto/submit-product.dto';
import { ProductImageDto } from './dto/image.dto';
import { QueryMyProductsDto } from './dto/query-my-products.dto';
import { SyncProviderConfigDto } from './dto/sync-provider-config.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async list(@Query() query: QueryProductDto) {
    return this.productService.findMany(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  mine(
    @CurrentUser() user: { userId: string },
    @Query() query: QueryMyProductsDto
  ) {
    return this.productService.findMine(user.userId, query);
  }

  @Post('provider/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  syncProviderConfig(
    @CurrentUser() user: { userId: string },
    @Body() dto: SyncProviderConfigDto
  ) {
    return this.productService.syncProviderConfig(user.userId, dto);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateProductDto) {
    return this.productService.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.productService.update(user.userId, id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  submit(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: SubmitProductDto
  ) {
    return this.productService.submit(user.userId, id, dto.remark);
  }

  @Patch(':id/online')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  online(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.productService.toggleOnline(id, user.userId, true);
  }

  @Patch(':id/offline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  offline(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.productService.toggleOnline(id, user.userId, false);
  }

  @Patch(':id/urgent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  urgent(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body('urgent') urgent: boolean | string | number
  ) {
    const urgentValue =
      urgent === true ||
      urgent === 'true' ||
      urgent === 1 ||
      urgent === '1';
    return this.productService.setUrgent(id, user.userId, urgentValue);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  addImage(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ProductImageDto
  ) {
    return this.productService.addImage(user.userId, id, dto);
  }

  @Patch(':id/images/:imageId/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  deleteImage(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('imageId') imageId: string
  ) {
    return this.productService.deleteImage(user.userId, id, imageId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  deleteProduct(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.productService.deleteProduct(user.userId, id);
  }
}
