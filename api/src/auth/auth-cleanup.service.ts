import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthCleanupService {

  constructor(private prisma: PrismaService) {}

  @Cron('0 3 * * *')
  async cleanExpiredTokens() {

    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true },
        ],
      },
    })

  }

}