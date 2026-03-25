import {
  Injectable,
  NotFoundException,
  Inject,
  LoggerService,
} from '@nestjs/common'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class FavoritesService {

  constructor(
    private prisma: PrismaService,

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async add(resourceId: number, userId: number) {

    this.logger.log('Adding favorite', { resourceId, userId })

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    })

    if (!resource) {
      this.logger.warn('Resource not found for favorite', {
        resourceId,
        userId,
      })
      throw new NotFoundException('Resource not found')
    }

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        resourceId,
      },
    })

    this.logger.log('Favorite added', {
      resourceId,
      userId,
    })

    return favorite
  }

  async remove(resourceId: number, userId: number) {

    this.logger.log('Removing favorite', { resourceId, userId })

    const result = await this.prisma.favorite.deleteMany({
      where: {
        userId,
        resourceId,
      },
    })

    this.logger.log('Favorite removed', {
      resourceId,
      userId,
      deletedCount: result.count,
    })

    return result
  }

  async list(userId: number, page = 1, limit = 10) {

    this.logger.log('Fetching favorites', { userId, page, limit })

    const skip = (page - 1) * limit

    const [favorites, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          resource: {
            include: { category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ])

    this.logger.log('Favorites fetched', { userId, count: favorites.length })

    return {
      data: favorites,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    }
  }
}