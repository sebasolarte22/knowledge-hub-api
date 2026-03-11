import { Injectable, OnModuleInit } from '@nestjs/common'
import { createClient } from 'redis'

@Injectable()
export class RedisService implements OnModuleInit {

  private client
  private enabled = false

  async onModuleInit() {

    const url = process.env.REDIS_URL

    if (!url) {
      console.log('Redis disabled (no REDIS_URL provided)')
      return
    }

    this.client = createClient({
      url,
    })

    this.client.on('error', (err) => {
      console.error('Redis error:', err)
    })

    await this.client.connect()

    this.enabled = true

    console.log('Redis connected')

  }

  async get(key: string) {

    if (!this.enabled) return null

    return this.client.get(key)

  }

  async set(key: string, value: string, ttl?: number) {

    if (!this.enabled) return

    if (ttl) {
      return this.client.set(key, value, { EX: ttl })
    }

    return this.client.set(key, value)

  }

  async del(key: string) {

    if (!this.enabled) return

    return this.client.del(key)

  }

}