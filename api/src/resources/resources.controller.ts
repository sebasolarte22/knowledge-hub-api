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
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common'

import { FileInterceptor } from '@nestjs/platform-express'

import { ResourcesService } from './resources.service'
import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'
import { UploadUrlDto } from './dto/upload-url.dto'

import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { S3Service } from '../storage/s3.service'
import { AuthenticatedRequest } from '../auth/types/jwt-payload.interface'

import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger'

const MAX_LIMIT = 100

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourcesController {

  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly s3Service: S3Service,
  ) {}

  // Create resource
  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
  create(
    @Body() dto: CreateResourceDto,
    @Req() req: AuthenticatedRequest,
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
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // 10 MB max
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          // Only images and PDFs
          new FileTypeValidator({ fileType: /^(image\/(jpeg|png|gif|webp)|application\/pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {

    return this.s3Service.uploadFile(file)

  }

  // uploaded directly to s3
  @Post('upload-url')
  @ApiOperation({ summary: 'Generate pre-signed URL for direct S3 upload' })
  async generateUploadUrl(
    @Body() dto: UploadUrlDto,
  ) {

    return this.s3Service.generateUploadUrl(
      dto.filename,
      dto.type,
    )

  }

  // list resources
  @Get()
  @ApiOperation({ summary: 'List resources with pagination and filters' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {

    const safePage = Math.max(1, Number(page))
    const safeLimit = Math.min(Math.max(1, Number(limit)), MAX_LIMIT)

    return this.resourcesService.findAll(
      req.user.sub,
      safePage,
      safeLimit,
      search,
      categoryId ? Number(categoryId) : undefined,
    )

  }

  // get resources by id
  @Get(':id')
  @ApiOperation({ summary: 'Get a resource by id' })
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
  ) {

    return this.resourcesService.remove(
      Number(id),
      req.user.sub,
      req.user.role,
    )

  }

}