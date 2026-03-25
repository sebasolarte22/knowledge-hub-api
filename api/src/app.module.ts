import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD, APP_FILTER } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'

import { AppController } from './app.controller'
import { AppService } from './app.service'

import { UsersModule } from './users/users.module'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { ResourcesModule } from './resources/resources.module'
import { CategoriesModule } from './categories/categories.module'
import { FavoritesModule } from './favorites/favorites.module'
import { RedisModule } from './redis/redis.module'

import { RolesGuard } from './auth/roles.guard'

import { LoggerModule } from './logger/logger.module'
import { HttpLoggerMiddleware } from './logger/http-logger.middleware'

import { QueueModule } from './queues/queue.module'
import { EventsModule } from './events/events.module'

import { CleanupModule } from './common/cleanup/cleanup.module'

// IMPORTANTE
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        REDIS_URL: Joi.string().optional(),
        AWS_REGION: Joi.string().optional(),
        AWS_ACCESS_KEY_ID: Joi.string().optional(),
        AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
        AWS_BUCKET_NAME: Joi.string().optional(),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),

    LoggerModule,

    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: process.env.NODE_ENV === 'test' ? 1000 : 5,
        },
      ],
    }),

    PrismaModule,
    UsersModule,
    AuthModule,
    ResourcesModule,
    CategoriesModule,
    FavoritesModule,
    RedisModule,

    QueueModule,
    EventsModule,

    CleanupModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    // GLOBAL ERROR FILTER
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // GLOBAL GUARDS
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
export class AppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .forRoutes('*')
  }
}