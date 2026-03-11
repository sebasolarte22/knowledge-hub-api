import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { RedisService } from '../src/redis/redis.service'
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard'

import { setupApp } from './setup'
import { redisMock } from './mocks/redis.mock'
import { cleanDatabase } from './utils/db-cleaner'
import { createTestUser } from './factories/user.factory'

describe('Resources (e2e)', () => {

  let app: INestApplication
  let user: any

  beforeAll(async () => {

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)

      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest()

          console.log('Mock guard injecting user:', user?.id)

          request.user = {
            sub: user?.id,
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

    jest.clearAllMocks()

    await cleanDatabase()

    user = await createTestUser()

    console.log('Test user created:', user)

  })

  afterAll(async () => {
    await app.close()
  })

  it('should create resource', async () => {

    const res = await request(app.getHttpServer())
      .post('/resources')
      .send({
        title: 'NestJS Docs',
        url: 'https://docs.nestjs.com',
      })

    console.log('CREATE RESOURCE RESPONSE:')
    console.log(res.status)
    console.log(res.body)

    expect(res.status).toBe(201)

    expect(res.body.title).toBe('NestJS Docs')

  })

  it('should list resources', async () => {

    const create = await request(app.getHttpServer())
      .post('/resources')
      .send({
        title: 'NestJS Docs',
        url: 'https://docs.nestjs.com',
      })

    console.log('RESOURCE CREATED:')
    console.log(create.body)

    const res = await request(app.getHttpServer())
      .get('/resources')

    console.log('LIST RESOURCES RESPONSE:')
    console.log(res.status)
    console.log(res.body)

    expect(res.status).toBe(200)

    expect(res.body.data.length).toBeGreaterThanOrEqual(1)

  })

})