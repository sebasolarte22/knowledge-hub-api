import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common'

import { FavoritesService } from './favorites.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger'

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {

  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':resourceId')
  @ApiOperation({ summary: 'Add resource to favorites' })
  add(
    @Param('resourceId') resourceId: string,
    @Req() req,
  ) {

    return this.favoritesService.add(
      Number(resourceId),
      req.user.sub,
    )

  }

  @Delete(':resourceId')
  @ApiOperation({ summary: 'Remove resource from favorites' })
  remove(
    @Param('resourceId') resourceId: string,
    @Req() req,
  ) {

    return this.favoritesService.remove(
      Number(resourceId),
      req.user.sub,
    )

  }

  @Get()
  @ApiOperation({ summary: 'List favorite resources' })
  list(@Req() req) {

    return this.favoritesService.list(
      req.user.sub,
    )

  }

}