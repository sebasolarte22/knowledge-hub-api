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

import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger'

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {

  constructor(
    private readonly resourcesService: ResourcesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
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
  @ApiOperation({ summary: 'List resources with pagination and filters' })
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
  @ApiOperation({ summary: 'Get a resource by id' })
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
  @ApiOperation({ summary: 'Update a resource' })
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
  @ApiOperation({ summary: 'Delete a resource' })
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