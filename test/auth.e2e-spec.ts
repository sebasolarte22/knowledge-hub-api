import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { setupApp } from './setup'
import { redisMock } from './mocks/redis.mock'
import { RedisService } from '../src/redis/redis.service'
import { cleanDatabase } from './utils/db-cleaner'

describe('Auth (e2e)', () => {

  let app: INestApplication

  beforeAll(async () => {

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)
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

  it('should register user', async () => {

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    expect(res.status).toBe(201)

  })

  it('should login user', async () => {

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    expect(res.body.accessToken).toBeDefined()

  })

})