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

  // borrar múltiples keys
  async delMany(keys: string[]) {
    if (!this.enabled || keys.length === 0) return
    return this.client.del(...keys)
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

  // ---------------- SCAN ----------------

  async scan(pattern: string): Promise<string[]> {
    if (!this.enabled) return []

    const stream = this.client.scanStream({
      match: pattern,
      count: 100,
    })

    const keys: string[] = []

    return new Promise((resolve, reject) => {
      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys)
      })

      stream.on('end', () => resolve(keys))
      stream.on('error', (err) => {
        this.logger.error('Redis scan error', { error: err.message })
        reject(err)
      })
    })
  }

  //  helper completo para limpiar cache por patrón
  async deleteByPattern(pattern: string) {
    if (!this.enabled) return

    const keys = await this.scan(pattern)

    if (keys.length > 0) {
      await this.delMany(keys)

      this.logger.log('Cache cleared by pattern', {
        pattern,
        count: keys.length,
      })
    }
  }
}