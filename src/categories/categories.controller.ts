import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common'

import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {

  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() req) {
    return this.categoriesService.create(dto, req.user.sub)
  }

  @Get()
  findAll(@Req() req) {
    return this.categoriesService.findAll(req.user.sub)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.categoriesService.remove(+id, req.user.sub)
  }

}