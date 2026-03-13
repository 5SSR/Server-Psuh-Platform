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
import { ProductService } from './product.service';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SubmitProductDto } from './dto/submit-product.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductImageDto } from './dto/image.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async list(@Query() query: QueryProductDto) {
    return this.productService.findMany(query);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateProductDto) {
    return this.productService.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.productService.update(user.userId, id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  submit(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: SubmitProductDto
  ) {
    return this.productService.submit(user.userId, id, dto.remark);
  }

  @Patch(':id/online')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  online(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.productService.toggleOnline(id, user.userId, true);
  }

  @Patch(':id/offline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  offline(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.productService.toggleOnline(id, user.userId, false);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  addImage(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ProductImageDto
  ) {
    return this.productService.addImage(user.userId, id, dto);
  }

  @Patch(':id/images/:imageId/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  deleteImage(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('imageId') imageId: string
  ) {
    return this.productService.deleteImage(user.userId, id, imageId);
  }
}
