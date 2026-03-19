import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { StringValue } from 'ms'

import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { EventsModule } from '../events/events.module'

import { JwtStrategy } from './jwt.strategy'

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EventsModule,
    ConfigModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET')

        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is not defined')
        }

        return {
          secret,
          signOptions: {
            expiresIn:
              configService.get<string>('JWT_ACCESS_EXPIRES') as StringValue,
          },
        }
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}