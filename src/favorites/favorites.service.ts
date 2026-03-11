import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class FavoritesService {

  constructor(private prisma: PrismaService) {}

  async add(resourceId: number, userId: number) {

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    })

    if (!resource) {
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

    return this.prisma.favorite.deleteMany({
      where: {
        userId,
        resourceId,
      },
    })

  }

  async list(userId: number) {

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