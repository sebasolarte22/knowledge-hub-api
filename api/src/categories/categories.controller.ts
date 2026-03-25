import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Patch,
  Param,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common'

import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AuthenticatedRequest } from '../auth/types/jwt-payload.interface'

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
    @Req() req: AuthenticatedRequest,
  ) {

    return this.categoriesService.create(
      dto,
      req.user.sub,
    )

  }

  @Get()
  @ApiOperation({ summary: 'List user categories' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {

    return this.categoriesService.findAll(
      req.user.sub,
      Number(page),
      Number(limit),
    )

  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {

    return this.categoriesService.update(
      Number(id),
      dto,
      req.user.sub,
    )

  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {

    return this.categoriesService.remove(
      Number(id),
      req.user.sub,
    )

  }

}