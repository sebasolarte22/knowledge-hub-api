import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RedisService } from '../redis/redis.service'

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  getSessions: jest.fn(),
}

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
}

const mockResponse = () => {
  const res = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  }
  return res as unknown as import('express').Response
}

const mockRequest = (overrides = {}) => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'jest', authorization: undefined },
  cookies: {},
  user: { sub: 1, email: 'user@test.com', role: 'user' },
  ...overrides,
} as unknown as import('express').Request)

describe('AuthController', () => {

  let controller: AuthController

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)

    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  // ---- REGISTER ----

  describe('register', () => {

    it('should call authService.register with correct args', async () => {
      mockAuthService.register.mockResolvedValue({ userId: 1, role: 'user' })

      const result = await controller.register({ email: 'a@b.com', password: 'pass123' })

      expect(mockAuthService.register).toHaveBeenCalledWith('a@b.com', 'pass123')
      expect(result).toMatchObject({ userId: 1 })
    })

  })

  // ---- LOGIN ----

  describe('login', () => {

    it('should set refreshToken cookie and return accessToken', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'acc',
        refreshToken: 'ref',
      })

      const req = mockRequest()
      const res = mockResponse()

      const result = await controller.login(
        { email: 'a@b.com', password: 'pass' },
        req,
        res,
      )

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'ref', expect.any(Object))
      expect(result).toEqual({ accessToken: 'acc' })
    })

  })

  // ---- REFRESH ----

  describe('refresh', () => {

    it('should throw if no refreshToken cookie', async () => {
      const req = mockRequest({ cookies: {} })
      const res = mockResponse()

      await expect(controller.refresh(req, res))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should rotate cookie and return new accessToken', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-acc',
        refreshToken: 'new-ref',
      })

      const req = mockRequest({ cookies: { refreshToken: 'old-ref' } })
      const res = mockResponse()

      const result = await controller.refresh(req, res)

      expect(mockAuthService.refresh).toHaveBeenCalledWith('old-ref')
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'new-ref', expect.any(Object))
      expect(result).toEqual({ accessToken: 'new-acc' })
    })

  })

  // ---- LOGOUT ----

  describe('logout', () => {

    it('should throw if no refreshToken cookie', async () => {
      const req = mockRequest({ cookies: {} })
      const res = mockResponse()

      await expect(controller.logout(req, res))
        .rejects.toThrow(UnauthorizedException)
    })

    it('should call logout and clear cookie', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out' })

      const req = mockRequest({
        cookies: { refreshToken: 'ref' },
        headers: { authorization: 'Bearer acc-token' },
      })
      const res = mockResponse()

      const result = await controller.logout(req, res)

      expect(mockAuthService.logout).toHaveBeenCalledWith('ref', 'acc-token')
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object))
      expect(result).toMatchObject({ message: 'Logged out' })
    })

  })

  // ---- SESSIONS ----

  describe('getSessions', () => {

    it('should return sessions for the authenticated user', async () => {
      const sessions = [{ id: 'sess-1', device: 'Chrome' }]
      mockAuthService.getSessions.mockResolvedValue(sessions)

      const req = mockRequest()
      const result = await controller.getSessions(req as never)

      expect(mockAuthService.getSessions).toHaveBeenCalledWith(1)
      expect(result).toEqual(sessions)
    })

  })

})
