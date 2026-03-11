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

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {

  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':resourceId')
  add(@Param('resourceId') resourceId: string, @Req() req) {

    return this.favoritesService.add(
      Number(resourceId),
      req.user.sub,
    )

  }

  @Delete(':resourceId')
  remove(@Param('resourceId') resourceId: string, @Req() req) {

    return this.favoritesService.remove(
      Number(resourceId),
      req.user.sub,
    )

  }

  @Get()
  list(@Req() req) {

    return this.favoritesService.list(req.user.sub)

  }

}