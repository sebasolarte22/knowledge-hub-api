import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { RedisService } from '../redis/redis.service'

import { EventPublisher } from '../events/event.publisher'

import * as bcrypt from 'bcrypt'
import { randomBytes, createHash, randomUUID } from 'crypto'

@Injectable()
export class AuthService {

  private readonly logger = new Logger(AuthService.name)

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private eventPublisher: EventPublisher,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  async register(email: string, password: string) {

    this.logger.log(`Register attempt for ${email}`)

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      this.logger.warn(`Email already registered: ${email}`)
      throw new ConflictException('Email already registered')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    // EVENT DRIVEN
    await this.eventPublisher.publish(
      'USER_CREATED',
      {
        userId: user.id,
        email: user.email,
      },
    )

    this.logger.log(`User created with id ${user.id}`)

    return {
      message: 'User created',
      userId: user.id,
      role: user.role,
    }

  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    device?: string,
  ) {
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    
    this.logger.log(`Login attempt for ${email}`)

    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      this.logger.warn(`Login failed: user not found ${email}`)
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(password, user.password)

    if (!passwordValid) {
      this.logger.warn(`Login failed: invalid password for ${email}`)
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = await this.jwtService.signAsync(payload)

    const refreshToken = randomBytes(64).toString('hex')
    const refreshHash = this.hashToken(refreshToken)

    const familyId = randomUUID()

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
      },
    })

    this.logger.log(`User logged in: ${user.id}`)

    return {
      accessToken,
      refreshToken,
    }

  }

  async refresh(refreshToken: string) {

    const hash = this.hashToken(refreshToken)

    const blacklisted = await this.redis.get(`blacklist:${hash}`)

    if (blacklisted) {
      this.logger.warn('Refresh token revoked')
      throw new UnauthorizedException('Token revoked')
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
      include: { session: true },
    })

    if (!stored) {
      this.logger.warn('Invalid refresh token')
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (stored.revoked) {

      this.logger.error('Refresh token reuse detected')

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
      },
    })

    this.logger.log(`Refresh token rotated for user ${user.id}`)

    return {
      accessToken,
      refreshToken: newRefresh,
    }

  }

  async logout(refreshToken: string) {

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

    this.logger.log(`Session logged out`)

    return {
      message: 'Logged out',
    }

  }

  async logoutAll(userId: number) {

    this.logger.warn(`User ${userId} logged out from all sessions`)

    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        session: {
          userId,
        },
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
        session: {
          userId,
        },
      },
    })

    await this.prisma.session.deleteMany({
      where: { userId },
    })

    return {
      message: 'All sessions revoked',
    }

  }

  async getSessions(userId: number) {

    this.logger.log(`Fetching sessions for user ${userId}`)

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