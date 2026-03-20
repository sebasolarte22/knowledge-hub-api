import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  LoggerService,
} from '@nestjs/common'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

import { PrismaService } from '../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { EventPublisher } from '../events/event.publisher'
import { RedisService } from '../redis/redis.service'

import * as bcrypt from 'bcrypt'
import { randomBytes, createHash, randomUUID } from 'crypto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eventPublisher: EventPublisher,
    private redis: RedisService,

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private getRefreshExpiration(days = 7) {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date
  }


  private async handleFailedLogin(ip: string, email: string) {

    const key = `rate:login:${ip}:${email}`

    const attempts = await this.redis.incr(key)

    const delay = Math.min(2 ** attempts, 300)

    await this.redis.expire(key, delay)

    this.logger.warn('Failed login attempt', {
      ip,
      email,
      attempts,
      delay,
    })
  }

  // ---------------- REGISTER ----------------

  async register(email: string, password: string) {
    this.logger.log('Register attempt', { email })

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      this.logger.warn('Register failed - email exists', { email })
      throw new ConflictException('Email already registered')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    await this.eventPublisher.publish('USER_CREATED', {
      userId: user.id,
      email: user.email,
    })

    this.logger.log('User created', {
      userId: user.id,
      email: user.email,
    })

    return {
      message: 'User created',
      userId: user.id,
      role: user.role,
    }
  }

  // ---------------- LOGIN ----------------

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    device?: string,
  ) {

    const ip = ipAddress || 'unKnown'

    this.logger.log('Login attempt', { email, ipAddress, device })

    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      await this.handleFailedLogin(ip, email)

      this.logger.warn('Login failed - user not found', { email })
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(password, user.password)

    if (!passwordValid) {
      await this.handleFailedLogin(ip, email)

      this.logger.warn('Login failed - wrong password', { email })
      throw new UnauthorizedException('Invalid credentials')
    }

    await this.redis.del(`rate:login:${ipAddress}:${email}`)

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = await this.jwtService.signAsync(payload)

    const refreshToken = randomBytes(64).toString('hex')
    const refreshHash = this.hashToken(refreshToken)
    const familyId = randomUUID()

    const expiresAt = this.getRefreshExpiration(7)

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress,
        device,
      },
    })

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        sessionId: session.id,
        familyId,
        expiresAt,
      },
    })

    this.logger.log('User logged in', {
      userId: user.id,
      sessionId: session.id,
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  // ---------------- REFRESH ----------------

  async refresh(refreshToken: string) {
    const hash = this.hashToken(refreshToken)

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
      include: { session: true },
    })

    if (!stored) {
      this.logger.warn('Invalid refresh token', { hash })
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (stored.expiresAt < new Date()) {
      this.logger.warn('Refresh token expired', {
        sessionId: stored.sessionId,
      })
      throw new UnauthorizedException('Token expired')
    }

    if (stored.revoked) {
      this.logger.error('Refresh token reuse detected', {
        familyId: stored.familyId,
      })

      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId },
        data: { revoked: true },
      })

      throw new UnauthorizedException('Refresh token reuse detected')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.session.userId },
    })

    if (!user) {
      this.logger.error('User not found during refresh', {
        userId: stored.session.userId,
      })
      throw new UnauthorizedException('User not found')
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = await this.jwtService.signAsync(payload)

    const newRefresh = randomBytes(64).toString('hex')
    const newHash = this.hashToken(newRefresh)

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: newHash,
        sessionId: stored.sessionId,
        familyId: stored.familyId,
        expiresAt: this.getRefreshExpiration(7),
      },
    })

    this.logger.log('Refresh token rotated', {
      userId: user.id,
    })

    return {
      accessToken,
      refreshToken: newRefresh,
    }
  }

  // ---------------- LOGOUT ----------------

  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken)

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
    })

    if (!stored) {
      this.logger.warn('Logout with invalid token')
      return { message: 'Logged out' }
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    this.logger.log('User logged out', {
      sessionId: stored.sessionId,
    })

    return { message: 'Logged out' }
  }

  // ---------------- LOGOUT ALL ----------------

  async logoutAll(userId: number) {
    this.logger.warn('Logout all sessions', { userId })

    await this.prisma.refreshToken.updateMany({
      where: {
        session: { userId },
      },
      data: { revoked: true },
    })

    await this.prisma.session.deleteMany({
      where: { userId },
    })

    return {
      message: 'All sessions revoked',
    }
  }

  // ---------------- SESSIONS ----------------

  async getSessions(userId: number) {
    this.logger.log('Fetching sessions', { userId })

    return this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        device: true,
        ipAddress: true,
        createdAt: true,
      },
    })
  }
}