import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common'

import { ResourcesService } from './resources.service'
import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {

  constructor(
    private readonly resourcesService: ResourcesService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateResourceDto,
    @Req() req,
  ) {

    return this.resourcesService.create(
      dto,
      req.user.sub,
    )

  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {

    return this.resourcesService.findAll(
      req.user.sub,
      Number(page),
      Number(limit),
      search,
      categoryId ? Number(categoryId) : undefined,
    )

  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req,
  ) {

    return this.resourcesService.findOne(
      Number(id),
      req.user.sub,
    )

  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
    @Req() req,
  ) {

    return this.resourcesService.update(
      Number(id),
      dto,
      req.user.sub,
      req.user.role,
    )

  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req,
  ) {

    return this.resourcesService.remove(
      Number(id),
      req.user.sub,
      req.user.role,
    )

  }

}