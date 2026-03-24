import {
  Injectable,
  OnModuleInit,
  Inject,
  LoggerService,
} from '@nestjs/common'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit {

  private client: Redis
  private enabled = false

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {

    const url = process.env.REDIS_URL

    if (!url) {
      this.logger.warn('Redis disabled (no REDIS_URL provided)')
      return
    }

    this.client = new Redis(url, {
      tls: {},
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        return Math.min(times * 50, 2000)
      },
    })

    this.client.on('connect', () => {
      this.logger.log('Redis connected')
    })

    this.client.on('error', (err) => {
      this.logger.error('Redis error', { error: err.message })
    })

    this.enabled = true
  }

  // ---------------- BASIC ----------------

  async get(key: string) {
    if (!this.enabled) return null
    return this.client.get(key)
  }

  async set(key: string, value: string, ttl?: number) {
    if (!this.enabled) return

    if (ttl) {
      return this.client.set(key, value, 'EX', ttl)
    }

    return this.client.set(key, value)
  }

  async del(key: string) {
    if (!this.enabled) return
    return this.client.del(key)
  }

  // ---------------- COUNTERS ----------------

  async incr(key: string): Promise<number> {
    if (!this.enabled) return 0
    return this.client.incr(key)
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.enabled) return 0
    return this.client.expire(key, seconds)
  }

  // ---------------- CACHE VERSIONING  ----------------

  async getVersion(key: string): Promise<number> {
    if (!this.enabled) return 1

    const value = await this.client.get(key)

    return value ? Number(value) : 1
  }

  async incrementVersion(key: string): Promise<number> {
    if (!this.enabled) return 1

    return this.client.incr(key)
  }
}