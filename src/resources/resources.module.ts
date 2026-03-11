import { Module } from '@nestjs/common'
import { ResourcesService } from './resources.service'
import { ResourcesController } from './resources.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}