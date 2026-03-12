import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'

import { Prisma } from '@prisma/client'

@Injectable()
export class ResourcesService {

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}
  // CREATE RESOURCE POST
  async create(dto: CreateResourceDto, userId: number) {

    if (dto.categoryId) {

      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          userId,
        },
      })

      if (!category) {
        throw new NotFoundException('Category not found')
      }

    }

    const resource = await this.prisma.resource.create({
      data: {
        title: dto.title,
        url: dto.url,
        description: dto.description,
        notes: dto.notes,

        user: {
          connect: { id: userId },
        },

        ...(dto.categoryId && {
          category: {
            connect: { id: dto.categoryId },
          },
        }),
      },
    })

    // limpiar cache del usuario
    await this.redis.del(`resources:${userId}`)

    return resource
  }

  // GET ALL 

  async findAll(
    userId: number,
    page = 1,
    limit = 10,
    search?: string,
    categoryId?: number,
  ) {

    const cacheKey = `resources:${userId}:${page}:${limit}:${search}:${categoryId}`

    const cached = await this.redis.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    const skip = (page - 1) * limit

    const where: Prisma.ResourceWhereInput = {
      createdBy: userId,
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ]
    }

    const resources = await this.prisma.resource.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
      },
    })

    const total = await this.prisma.resource.count({
      where,
    })

    const result = {
      data: resources,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    }

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      60, // TTL 60s
    )

    return result
  }

  // GET BY ID 

  async findOne(id: number, userId: number) {

    const resource = await this.prisma.resource.findFirst({
      where: {
        id,
        createdBy: userId,
      },
      include: {
        category: true,
      },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    return resource
  }

  // PATCH
  
  async update(
    id: number,
    dto: UpdateResourceDto,
    userId: number,
    role: string,
  ) {

    const resource = await this.prisma.resource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    if (role !== 'admin' && resource.createdBy !== userId) {
      throw new ForbiddenException('Not allowed')
    }

    if (dto.categoryId) {

      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          userId,
        },
      })

      if (!category) {
        throw new NotFoundException('Category not found')
      }

    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: dto,
    })

    await this.redis.del(`resources:${userId}`)

    return updated
  }

  // DELETE 

  async remove(
    id: number,
    userId: number,
    role: string,
  ) {

    const resource = await this.prisma.resource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    if (role !== 'admin' && resource.createdBy !== userId) {
      throw new ForbiddenException('Not allowed')
    }

    const deleted = await this.prisma.resource.delete({
      where: { id },
    })

    await this.redis.del(`resources:${userId}`)

    return deleted
  }

}