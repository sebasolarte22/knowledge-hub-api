import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'

import { JwtStrategy } from './jwt.strategy'

import { EventsModule } from '../events/events.module'

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EventsModule,

    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
  ],
})
export class AuthModule {}