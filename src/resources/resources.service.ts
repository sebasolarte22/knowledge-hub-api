import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'

import { Prisma } from '@prisma/client'

@Injectable()
export class ResourcesService {

  private readonly logger = new Logger(ResourcesService.name)

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // CREATE RESOURCE
  async create(dto: CreateResourceDto, userId: number) {

    this.logger.log(`Creating resource for user ${userId}`)

    if (dto.categoryId) {

      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          userId,
        },
      })

      if (!category) {
        this.logger.warn(`Category ${dto.categoryId} not found for user ${userId}`)
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

    await this.redis.del(`resources:${userId}:*`)

    this.logger.log(`Resource created id=${resource.id} user=${userId}`)

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

    this.logger.log(`Fetching resources user=${userId} page=${page} limit=${limit}`)

    const cacheKey = `resources:${userId}:${page}:${limit}:${search}:${categoryId}`

    const cached = await this.redis.get(cacheKey)

    if (cached) {
      this.logger.debug(`Cache hit for user ${userId}`)
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

    const total = await this.prisma.resource.count({ where })

    const result = {
      data: resources,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    }

    await this.redis.set(cacheKey, JSON.stringify(result), 60)

    return result
  }

  // GET BY ID
  async findOne(id: number, userId: number) {

    this.logger.log(`Fetching resource ${id} for user ${userId}`)

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
      this.logger.warn(`Resource ${id} not found for user ${userId}`)
      throw new NotFoundException('Resource not found')
    }

    return resource
  }

  // UPDATE
  async update(
    id: number,
    dto: UpdateResourceDto,
    userId: number,
    role: string,
  ) {

    this.logger.log(`Updating resource ${id} by user ${userId}`)

    const resource = await this.prisma.resource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    if (role !== 'admin' && resource.createdBy !== userId) {
      this.logger.warn(`Unauthorized update attempt resource=${id} user=${userId}`)
      throw new ForbiddenException('Not allowed')
    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: dto,
    })

    await this.redis.del(`resources:${userId}:*`)

    this.logger.log(`Resource updated id=${id}`)

    return updated
  }

  // DELETE
  async remove(
    id: number,
    userId: number,
    role: string,
  ) {

    this.logger.log(`Deleting resource ${id} by user ${userId}`)

    const resource = await this.prisma.resource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    if (role !== 'admin' && resource.createdBy !== userId) {
      this.logger.warn(`Unauthorized delete attempt resource=${id} user=${userId}`)
      throw new ForbiddenException('Not allowed')
    }

    const deleted = await this.prisma.resource.delete({
      where: { id },
    })

    await this.redis.del(`resources:${userId}:*`)

    this.logger.log(`Resource deleted id=${id}`)

    return deleted
  }

}