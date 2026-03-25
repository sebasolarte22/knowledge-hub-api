import { Injectable, Inject, LoggerService } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

@Injectable()
export class CleanupService {

  constructor(
    private prisma: PrismaService,

    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // every night at midnight
  @Cron('0 0 * * *')
  async cleanExpiredData() {

    this.logger.log('Starting nightly cleanup job')

    const now = new Date()

    const tokens = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { revoked: true },
          { expiresAt: { lt: now } },
        ],
      },
    })

    const sessions = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: now } },
    })

    this.logger.log('Cleanup finished', {
      deletedTokens: tokens.count,
      deletedSessions: sessions.count,
    })
  }
}