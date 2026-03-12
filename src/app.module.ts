import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

import { BullModule } from '@nestjs/bullmq'

import { AppController } from './app.controller'
import { AppService } from './app.service'

import { UsersModule } from './users/users.module'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { ResourcesModule } from './resources/resources.module'
import { CategoriesModule } from './categories/categories.module'
import { FavoritesModule } from './favorites/favorites.module'
import { RolesGuard } from './auth/roles.guard'
import { RedisModule } from './redis/redis.module'

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: process.env.NODE_ENV === 'test' ? 1000 : 5,
        },
      ],
    }),

    // GLOBAL CONECTION BULLMQ
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),

    PrismaModule,
    UsersModule,
    AuthModule,
    ResourcesModule,
    CategoriesModule,
    FavoritesModule,
    RedisModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

  ],
})
export class AppModule {}