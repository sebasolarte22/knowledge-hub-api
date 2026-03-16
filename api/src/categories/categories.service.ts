import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'

@Injectable()
export class CategoriesService {

  private readonly logger = new Logger(CategoriesService.name)

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, userId: number) {

    this.logger.log(`Creating category for user ${userId}`)

    return this.prisma.category.create({
      data: {
        ...dto,
        userId,
      },
    })

  }

  async findAll(userId: number) {

    this.logger.log(`Fetching categories for user ${userId}`)

    return this.prisma.category.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    })

  }

  async remove(id: number, userId: number) {

    this.logger.log(`Deleting category ${id} user=${userId}`)

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!category) {
      this.logger.warn(`Category ${id} not found for user ${userId}`)
      throw new NotFoundException('Category not found')
    }

    return this.prisma.category.delete({
      where: { id },
    })

  }

}