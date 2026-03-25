import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { setupApp } from './setup'
import { redisMock } from './mocks/redis.mock'
import { RedisService } from '../src/redis/redis.service'
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard'
import { cleanDatabase } from './utils/db-cleaner'

describe('Logout All (e2e)', () => {

  let app: INestApplication

  beforeAll(async () => {

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)

      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: import("@nestjs/common").ExecutionContext) => {
          const request = context.switchToHttp().getRequest()

          request.user = {
            sub: 1,
            role: 'user',
          }

          return true
        },
      })

      .compile()

    app = moduleFixture.createNestApplication()
    setupApp(app)
    await app.init()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should logout all sessions', async () => {

    const res = await request(app.getHttpServer())
      .post('/auth/logout-all')

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
  })
})