import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { cleanDatabase } from './utils/db-cleaner'
import { setupApp } from './setup'

describe('Auth Flow (e2e)', () => {

  let app: INestApplication
  let accessToken: string
  let agent: request.Agent

  beforeAll(async () => {

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    setupApp(app)

    await app.init()

    agent = request.agent(app.getHttpServer())

  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await app.close()
  })

  it('register user', async () => {

    const res = await agent
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    expect(res.status).toBe(201)

  })

  it('login user', async () => {

    await agent
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const res = await agent
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    expect(res.status).toBe(201)

    accessToken = res.body.accessToken

    expect(accessToken).toBeDefined()

  })

  it('refresh token', async () => {

    await agent
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    await agent
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const refresh = await agent
      .post('/auth/refresh')

    expect(refresh.status).toBe(201)

    expect(refresh.body.accessToken).toBeDefined()

  })

  it('logout session', async () => {

    await agent
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    await agent
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const logout = await agent
      .post('/auth/logout')

    expect(logout.status).toBe(201)

  })

  it('get sessions', async () => {

    await agent
      .post('/auth/register')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    const login = await agent
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: '123456',
      })

    accessToken = login.body.accessToken

    const sessions = await agent
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(sessions.status).toBe(200)

    expect(Array.isArray(sessions.body)).toBe(true)

  })

it('detect refresh token reuse attack', async () => {

  await agent
    .post('/auth/register')
    .send({
      email: 'attack@test.com',
      password: '123456',
    })

  const login = await agent
    .post('/auth/login')
    .send({
      email: 'attack@test.com',
      password: '123456',
    })

  const cookie = login.headers['set-cookie']?.[0]

  if (!cookie) {
    throw new Error('No refresh token cookie returned from login')
  }

  const refresh1 = await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', cookie)

  expect(refresh1.status).toBe(201)

  const attack = await request(app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', cookie)

  expect(attack.status).toBe(401)

})

})