import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Logout All (e2e)', () => {

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
        email: 'test2@test.com',
        password: '123456'
      })

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test2@test.com',
        password: '123456'
      })

    accessToken = login.body.accessToken

  })

  afterAll(async () => {
    await app.close()
  })

  it('logout all sessions', async () => {

    const res = await request(app.getHttpServer())
      .post('/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(201)

  })

})