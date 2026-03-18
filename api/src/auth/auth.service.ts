import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  LoggerService
} from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { RedisService } from '../redis/redis.service'
import { EventPublisher } from '../events/event.publisher'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

import * as bcrypt from 'bcrypt'
import { randomBytes, createHash, randomUUID } from 'crypto'

@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private eventPublisher: EventPublisher,

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // HELPERS

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private async generateTokens(user: any) {

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = await this.jwtService.signAsync(payload)

    const refreshToken = randomBytes(64).toString('hex')
    const refreshHash = this.hashToken(refreshToken)

    const expiresIn = 7 * 24 * 60 * 60 * 1000
    const expiresAt = new Date(Date.now() + expiresIn)

    return { accessToken, refreshToken, refreshHash, expiresAt }
  }


  // REGISTER


  async register(email: string, password: string, requestId?: string) {

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      this.logger.warn('AUTH_REGISTER_FAILED', { requestId })
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

    this.logger.log('AUTH_REGISTER_SUCCESS', {
      userId: user.id,
      requestId,
    })

    return {
      message: 'User created',
      userId: user.id,
      role: user.role,
    }
  }

  // LOGIN

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    device?: string,
    requestId?: string,
  ) {

    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      this.logger.warn('AUTH_LOGIN_FAILED', { requestId })
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(password, user.password)

    if (!passwordValid) {
      this.logger.warn('AUTH_LOGIN_FAILED', { requestId })
      throw new UnauthorizedException('Invalid credentials')
    }

    const { accessToken, refreshToken, refreshHash, expiresAt } =
      await this.generateTokens(user)

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
        familyId: randomUUID(),
        expiresAt,
      },
    })

    this.logger.log('AUTH_LOGIN_SUCCESS', {
      userId: user.id,
      sessionId: session.id,
      ip: ipAddress,
      requestId,
    })

    return { accessToken, refreshToken }
  }

  // REFRESH

  async refresh(refreshToken: string, requestId?: string) {

    const hash = this.hashToken(refreshToken)

    const blacklisted = await this.redis.get(`blacklist:${hash}`)

    if (blacklisted) {
      this.logger.warn('AUTH_REFRESH_BLOCKED', { requestId })
      throw new UnauthorizedException('Token revoked')
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
      include: { session: true },
    })

    if (!stored) {
      this.logger.warn('AUTH_REFRESH_FAILED', { requestId })
      throw new UnauthorizedException('Invalid refresh token')
    }

    // expiration

    if (stored.expiresAt < new Date()) {
      this.logger.warn('AUTH_REFRESH_EXPIRED', { requestId })

      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      })

      throw new UnauthorizedException('Refresh token expired')
    }

    // 🔥 reuse detection
    if (stored.revoked) {

      this.logger.error('AUTH_REFRESH_REUSE', {
        familyId: stored.familyId,
        requestId,
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
      throw new UnauthorizedException('User not found')
    }

    const {
      accessToken,
      refreshToken: newRefresh,
      refreshHash,
      expiresAt,
    } = await this.generateTokens(user)

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        sessionId: stored.sessionId,
        familyId: stored.familyId,
        expiresAt,
      },
    })

    this.logger.log('AUTH_REFRESH_SUCCESS', {
      userId: user.id,
      requestId,
    })

    return {
      accessToken,
      refreshToken: newRefresh,
    }
  }

  // LOGOUT

  async logout(refreshToken: string, requestId?: string) {

    const hash = this.hashToken(refreshToken)

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
    })

    if (!stored) {
      return { message: 'Logged out' }
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    await this.redis.set(
      `blacklist:${hash}`,
      'revoked',
      60 * 60 * 24 * 7,
    )

    this.logger.log('AUTH_LOGOUT', {
      tokenId: stored.id,
      requestId,
    })

    return { message: 'Logged out' }
  }

  // LOGOUT ALL

  async logoutAll(userId: number, requestId?: string) {

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        session: { userId },
      },
    })

    for (const token of tokens) {
      await this.redis.set(
        `blacklist:${token.tokenHash}`,
        'revoked',
        60 * 60 * 24 * 7,
      )
    }

    await this.prisma.refreshToken.deleteMany({
      where: {
        session: { userId },
      },
    })

    await this.prisma.session.deleteMany({
      where: { userId },
    })

    this.logger.warn('AUTH_LOGOUT_ALL', {
      userId,
      requestId,
    })

    return {
      message: 'All sessions revoked',
    }
  }

  // SESSIONS

  async getSessions(userId: number) {

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