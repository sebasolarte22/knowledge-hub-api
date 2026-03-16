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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'

import { FileInterceptor } from '@nestjs/platform-express'

import { ResourcesService } from './resources.service'
import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'

import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { S3Service } from '../storage/s3.service'

import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger'

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {

  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly s3Service: S3Service,
  ) {}

  // Crear resource
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

  // upload file through backend
  @Post('upload')
  @ApiOperation({ summary: 'Upload file to S3 via backend' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
  ) {

    return this.s3Service.uploadFile(file)

  }

  // uploaded directly to s3
  @Post('upload-url')
  @ApiOperation({ summary: 'Generate pre-signed URL for direct S3 upload' })
  async generateUploadUrl(
    @Body() body: { filename: string; type: string },
  ) {

    return this.s3Service.generateUploadUrl(
      body.filename,
      body.type,
    )

  }

  // list resources
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

  // get resources by id
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

  // modify resources
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

  // delete resources
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