import request from 'supertest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'

import { AppModule } from '../src/app.module'
import { setupApp } from './setup'
import { redisMock } from './mocks/redis.mock'
import { RedisService } from '../src/redis/redis.service'
import { cleanDatabase } from './utils/db-cleaner'

describe('Auth Refresh (e2e)', () => {

  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .overrideProvider('bullQueue_default')
      .useValue({
        add: jest.fn(),
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

  it('should refresh tokens successfully', async () => {

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    // IMPORTANTE: tomar cookie real
    const cookies = login.headers['set-cookie']

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies) // 👈 AQUÍ EL FIX REAL

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('should detect reuse of refresh token', async () => {

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const cookies = login.headers['set-cookie']

    const refresh1 = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)

    expect(refresh1.status).toBe(201)

    const refresh2 = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)

    expect(refresh2.status).toBe(401)
  })

})