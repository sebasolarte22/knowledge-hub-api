import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'

@Injectable()
export class CategoriesService {

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, userId: number) {

    return this.prisma.category.create({
      data: {
        ...dto,
        userId,
      },
    })

  }

  async findAll(userId: number) {

    return this.prisma.category.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    })

  }

  async remove(id: number, userId: number) {

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    return this.prisma.category.delete({
      where: { id },
    })

  }

}