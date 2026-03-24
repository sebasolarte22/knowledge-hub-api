import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PassThrough } from 'stream'

describe('Users (e2e)', () => {

  let app: INestApplication
  let accessToken: string

  beforeAll(async () => {

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        Password: '123456'
      })

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    accessToken = login.body.data.accessToken

  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /users', async () => {

    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)

  })

})