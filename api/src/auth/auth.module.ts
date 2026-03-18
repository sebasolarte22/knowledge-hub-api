import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { EventsModule } from '../events/events.module'
import { LoggerModule } from '../logger/logger.module'

import { JwtStrategy } from './jwt.strategy'
import { AuthCleanupService } from './auth-cleanup.service'

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EventsModule,
    LoggerModule,

    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'default-secret',
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as any,
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
    AuthCleanupService,
  ],

  exports: [AuthService],
})
export class AuthModule {}