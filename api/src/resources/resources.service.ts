import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  LoggerService,
} from '@nestjs/common'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

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

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  //  helper para limpiar cache correctamente
  private async clearUserCache(userId: number) {
    const pattern = `resources:${userId}:*`

    await this.redis.deleteByPattern(`resources:${userId}:*`)
    
    this.logger.log('Cache cleared', { userId })
  }

  // CREATE RESOURCE
  async create(dto: CreateResourceDto, userId: number) {

    this.logger.log('Creating resource', { userId, dto })

    if (dto.categoryId) {

      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          userId,
        },
      })

      if (!category) {
        this.logger.warn('Category not found', {
          categoryId: dto.categoryId,
          userId,
        })
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

    await this.clearUserCache(userId)

    this.logger.log('Resource created', {
      resourceId: resource.id,
      userId,
    })

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

    this.logger.log('Fetching resources', {
      userId,
      page,
      limit,
      search,
      categoryId,
    })

    const cacheKey = `resources:${userId}:${page}:${limit}:${search}:${categoryId}`

    const cached = await this.redis.get(cacheKey)

    if (cached) {
      this.logger.debug?.('Cache hit', { userId, cacheKey })
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

    this.logger.log('Resources fetched', {
      userId,
      count: resources.length,
    })

    return result
  }

  // GET BY ID
  async findOne(id: number, userId: number) {

    this.logger.log('Fetching resource', { id, userId })

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
      this.logger.warn('Resource not found', { id, userId })
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

    this.logger.log('Updating resource', { id, userId })

    const resource = await this.prisma.resource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    if (role !== 'admin' && resource.createdBy !== userId) {
      this.logger.warn('Unauthorized update attempt', {
        resourceId: id,
        userId,
      })
      throw new ForbiddenException('Not allowed')
    }

    const updated = await this.prisma.resource.update({
      where: { id },
      data: dto,
    })

    await this.clearUserCache(userId)

    this.logger.log('Resource updated', { id })

    return updated
  }

  // DELETE
  async remove(
    id: number,
    userId: number,
    role: string,
  ) {

    this.logger.log('Deleting resource', { id, userId })

    const resource = await this.prisma.resource.findUnique({
      where: { id },
    })

    if (!resource) {
      throw new NotFoundException('Resource not found')
    }

    if (role !== 'admin' && resource.createdBy !== userId) {
      this.logger.warn('Unauthorized delete attempt', {
        resourceId: id,
        userId,
      })
      throw new ForbiddenException('Not allowed')
    }

    const deleted = await this.prisma.resource.delete({
      where: { id },
    })

    await this.clearUserCache(userId)

    this.logger.log('Resource deleted', { id })

    return deleted
  }
}