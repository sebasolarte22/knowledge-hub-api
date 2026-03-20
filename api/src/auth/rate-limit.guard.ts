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

    const ip =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.ip

    const email = request.body?.email || 'unknown'

    const key = `rate:login:${ip}:${email}`

    const attempts = await this.redis.get(key)

    if (attempts && Number(attempts) > 5) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    return true
  }
}