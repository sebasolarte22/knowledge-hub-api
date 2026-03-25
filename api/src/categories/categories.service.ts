import {
  Injectable,
  NotFoundException,
  Inject,
  LoggerService,
} from '@nestjs/common'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Injectable()
export class CategoriesService {

  constructor(
    private prisma: PrismaService,

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateCategoryDto, userId: number) {

    this.logger.log('Creating category', { userId, dto })

    const category = await this.prisma.category.create({
      data: {
        ...dto,
        userId,
      },
    })

    this.logger.log('Category created', {
      categoryId: category.id,
      userId,
    })

    return category
  }

  async findAll(userId: number, page = 1, limit = 20) {

    this.logger.log('Fetching categories', { userId, page, limit })

    const skip = (page - 1) * limit

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where: { userId } }),
    ])

    this.logger.log('Categories fetched', { userId, count: categories.length })

    return {
      data: categories,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    }
  }

  async update(id: number, dto: UpdateCategoryDto, userId: number) {

    this.logger.log('Updating category', { id, userId })

    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    })

    if (!category) {
      this.logger.warn('Category not found', { categoryId: id, userId })
      throw new NotFoundException('Category not found')
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
    })

    this.logger.log('Category updated', { categoryId: id, userId })

    return updated
  }

  async remove(id: number, userId: number) {

    this.logger.log('Deleting category', { id, userId })

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!category) {
      this.logger.warn('Category not found', {
        categoryId: id,
        userId,
      })
      throw new NotFoundException('Category not found')
    }

    const deleted = await this.prisma.category.delete({
      where: { id },
    })

    this.logger.log('Category deleted', {
      categoryId: id,
      userId,
    })

    return deleted
  }
}