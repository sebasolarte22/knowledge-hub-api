import {
  Injectable,
  UnauthorizedException,
  Inject,
  LoggerService,
} from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Request } from 'express'
import { createHash } from 'crypto'
import { ConfigService } from '@nestjs/config'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { RedisService } from '../redis/redis.service'
import { JwtPayload } from './types/jwt-payload.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(
    private readonly redis: RedisService,
    configService: ConfigService,

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true,
    })
  }

  async validate(req: Request, payload: JwtPayload) {

    // Check access token blacklist (for logout invalidation)
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req)

    if (token) {
      const hash = createHash('sha256').update(token).digest('hex')
      const revoked = await this.redis.get(`blacklist:${hash}`)

      if (revoked) {
        this.logger.warn('Revoked access token used', { sub: payload.sub })
        throw new UnauthorizedException('Token has been revoked')
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    }

  }
}