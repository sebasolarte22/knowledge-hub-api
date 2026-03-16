import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class FavoritesService {

  private readonly logger = new Logger(FavoritesService.name)

  constructor(private prisma: PrismaService) {}

  async add(resourceId: number, userId: number) {

    this.logger.log(`Adding favorite resource=${resourceId} user=${userId}`)

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    })

    if (!resource) {
      this.logger.warn(`Resource ${resourceId} not found`)
      throw new NotFoundException('Resource not found')
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        resourceId,
      },
    })

  }

  async remove(resourceId: number, userId: number) {

    this.logger.log(`Removing favorite resource=${resourceId} user=${userId}`)

    return this.prisma.favorite.deleteMany({
      where: {
        userId,
        resourceId,
      },
    })

  }

  async list(userId: number) {

    this.logger.log(`Fetching favorites for user ${userId}`)

    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        resource: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

  }

}