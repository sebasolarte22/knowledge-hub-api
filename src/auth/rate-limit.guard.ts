import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common'

import { RedisService } from '../redis/redis.service'

@Injectable()
export class RateLimitGuard implements CanActivate {

  constructor(private redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const request = context.switchToHttp().getRequest()

    const ip = request.ip

    const key = `rate:login:${ip}`

    const current = await this.redis.get(key)

    if (current && Number(current) >= 5) {

      throw new HttpException(
        'Too many login attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      )

    }

    if (!current) {

      await this.redis.set(key, '1', 60)

    } else {

      await this.redis.set(
        key,
        String(Number(current) + 1),
        60,
      )

    }

    return true

  }

}