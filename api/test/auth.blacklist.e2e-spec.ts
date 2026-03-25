import request from 'supertest'
import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { createHash } from 'crypto'

import { AppModule } from '../src/app.module'
import { setupApp } from './setup'
import { RedisService } from '../src/redis/redis.service'
import { cleanDatabase } from './utils/db-cleaner'
import { getQueueToken } from '@nestjs/bullmq'

/**
 * In-memory Redis store for blacklist testing.
 * Simulates get/set with TTL so we can verify blacklisting behavior.
 */
const store: Record<string, string> = {}

const redisMock = {
  get: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  set: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve('OK') }),
  del: jest.fn((key: string) => { delete store[key]; return Promise.resolve(1) }),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  incrementVersion: jest.fn().mockResolvedValue(1),
  getVersion: jest.fn().mockResolvedValue(1),
}

describe('Auth Blacklist (e2e)', () => {

  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)

      .overrideProvider(getQueueToken('default'))
      .useValue({ add: jest.fn() })

      .compile()

    app = moduleFixture.createNestApplication()
    setupApp(app)
    await app.init()
  })

  beforeEach(async () => {
    await cleanDatabase()
    // Clear in-memory store between tests
    Object.keys(store).forEach(k => delete store[k])
    jest.clearAllMocks()
    // Restore implementations after clearAllMocks
    redisMock.get.mockImplementation((key: string) => Promise.resolve(store[key] ?? null))
    redisMock.set.mockImplementation((key: string, value: string) => { store[key] = value; return Promise.resolve('OK') })
  })

  afterAll(async () => {
    await app.close()
  })

  it('should reject a blacklisted access token after logout', async () => {

    // 1. Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'blacklist@test.com', password: '123456' })

    // 2. Login — get accessToken + refreshToken cookie
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'blacklist@test.com', password: '123456' })

    const accessToken: string = login.body.data.accessToken
    const cookies = login.headers['set-cookie']

    expect(accessToken).toBeDefined()

    // 3. Verify access token works before logout
    const beforeLogout = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookies)

    expect(beforeLogout.status).toBe(200)

    // 4. Logout — sending access token so it gets blacklisted
    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookies)

    expect(logout.status).toBe(201)

    // 5. Verify the token hash is now in the blacklist store
    const hash = createHash('sha256').update(accessToken).digest('hex')
    expect(store[`blacklist:${hash}`]).toBe('1')

    // 6. Access token should now be rejected
    const afterLogout = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(afterLogout.status).toBe(401)
  })
})
