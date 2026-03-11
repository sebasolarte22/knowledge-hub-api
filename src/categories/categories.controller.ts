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

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger'

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {

  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  create(
    @Body() dto: CreateCategoryDto,
    @Req() req,
  ) {

    return this.categoriesService.create(
      dto,
      req.user.sub,
    )

  }

  @Get()
  @ApiOperation({ summary: 'List user categories' })
  findAll(@Req() req) {

    return this.categoriesService.findAll(
      req.user.sub,
    )

  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  remove(
    @Param('id') id: string,
    @Req() req,
  ) {

    return this.categoriesService.remove(
      Number(id),
      req.user.sub,
    )

  }

}