import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { RedisService } from '../redis/redis.service'
import { EventPublisher } from '../events/event.publisher'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import * as bcrypt from 'bcrypt'

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
}

const mockEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) }

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('access-token'),
  decode: jest.fn(),
}

describe('AuthService', () => {

  let service: AuthService
  let prisma: jest.Mocked<PrismaService>

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            session: {
              create: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        { provide: JwtService, useValue: mockJwt },
        { provide: RedisService, useValue: mockRedis },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prisma = module.get(PrismaService)

    jest.clearAllMocks()
    mockJwt.signAsync.mockResolvedValue('access-token')
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  // ---- REGISTER ----

  describe('register', () => {

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({ id: 1, email: 'test@test.com' })

      await expect(service.register('test@test.com', 'pass123'))
        .rejects.toThrow(ConflictException)
    })

    it('should create user and return userId and role', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null)
      prisma.user.create = jest.fn().mockResolvedValue({
        id: 1,
        email: 'new@test.com',
        role: 'user',
      })

      const result = await service.register('new@test.com', 'pass123')

      expect(prisma.user.create).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({ userId: 1, role: 'user' })
    })

    it('should hash the password before saving', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null)

      let savedPassword = ''
      prisma.user.create = jest.fn().mockImplementation(({ data }) => {
        savedPassword = data.password
        return Promise.resolve({ id: 1, email: data.email, role: 'user' })
      })

      await service.register('new@test.com', 'plaintext')

      expect(savedPassword).not.toBe('plaintext')
      expect(await bcrypt.compare('plaintext', savedPassword)).toBe(true)
    })

  })

  // ---- LOGIN ----

  describe('login', () => {

    const mockUser = {
      id: 1,
      email: 'user@test.com',
      password: bcrypt.hashSync('correct', 10),
      role: 'user',
    }

    beforeEach(() => {
      prisma.session.create = jest.fn().mockResolvedValue({ id: 'session-1' })
      prisma.refreshToken.create = jest.fn().mockResolvedValue({})
    })

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null)

      await expect(service.login('unknown@test.com', 'pass', '1.2.3.4'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when password is wrong', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      await expect(service.login('user@test.com', 'wrong', '1.2.3.4'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should return accessToken and refreshToken on success', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      const result = await service.login('user@test.com', 'correct', '1.2.3.4')

      expect(result).toHaveProperty('accessToken', 'access-token')
      expect(result).toHaveProperty('refreshToken')
      expect(typeof result.refreshToken).toBe('string')
    })

    it('should increment failed login counter on wrong password', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)
      mockRedis.incr.mockResolvedValue(3)

      await expect(service.login('user@test.com', 'wrong', '1.2.3.4'))
        .rejects.toThrow(UnauthorizedException)

      expect(mockRedis.incr).toHaveBeenCalledWith(expect.stringContaining('rate:login'))
    })

    it('should clear rate limit key on successful login', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      await service.login('user@test.com', 'correct', '1.2.3.4')

      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('rate:login'))
    })

  })

  // ---- REFRESH ----

  describe('refresh', () => {

    it('should throw UnauthorizedException when token not found', async () => {
      prisma.refreshToken.findFirst = jest.fn().mockResolvedValue(null)

      await expect(service.refresh('invalid-token'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when token is expired', async () => {
      prisma.refreshToken.findFirst = jest.fn().mockResolvedValue({
        id: 1,
        expiresAt: new Date(Date.now() - 1000),
        revoked: false,
        familyId: 'fam-1',
        sessionId: 'sess-1',
        session: { userId: 1 },
      })

      await expect(service.refresh('some-token'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should revoke entire family and throw on reuse detection', async () => {
      prisma.refreshToken.findFirst = jest.fn().mockResolvedValue({
        id: 1,
        expiresAt: new Date(Date.now() + 100000),
        revoked: true,
        familyId: 'fam-1',
        sessionId: 'sess-1',
        session: { userId: 1 },
      })
      prisma.refreshToken.updateMany = jest.fn().mockResolvedValue({ count: 2 })

      await expect(service.refresh('reused-token'))
        .rejects.toThrow(UnauthorizedException)

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: 'fam-1' } }),
      )
    })

  })

  // ---- LOGOUT ----

  describe('logout', () => {

    it('should blacklist a valid access token', async () => {
      const exp = Math.floor(Date.now() / 1000) + 300
      mockJwt.decode.mockReturnValue({ exp })

      prisma.refreshToken.findFirst = jest.fn().mockResolvedValue({ id: 1, sessionId: 'sess-1' })
      prisma.refreshToken.update = jest.fn().mockResolvedValue({})

      await service.logout('refresh-token', 'access-token')

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        '1',
        expect.any(Number),
      )
    })

    it('should still succeed when refresh token is not found', async () => {
      prisma.refreshToken.findFirst = jest.fn().mockResolvedValue(null)

      const result = await service.logout('unknown-refresh')

      expect(result).toMatchObject({ message: 'Logged out' })
    })

  })

})
