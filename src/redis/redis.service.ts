import { Injectable, OnModuleInit } from '@nestjs/common'
import { createClient } from 'redis'

@Injectable()
export class RedisService implements OnModuleInit {

  private client

  async onModuleInit() {

    this.client = createClient({
      url: 'redis://localhost:6379',
    })

    await this.client.connect()

  }

  async get(key: string) {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttl?: number) {

    if (ttl) {
      return this.client.set(key, value, {
        EX: ttl,
      })
    }

    return this.client.set(key, value)
  }

  async del(key: string) {
    return this.client.del(key)
  }

}