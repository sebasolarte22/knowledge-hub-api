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

  // every night
  @Cron('0 0 * * *')
  async cleanTokens() {

    this.logger.log('Starting cleanup job')

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { revoked: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    })

    this.logger.log('Cleanup finished', {
      deletedCount: result.count,
    })
  }
}