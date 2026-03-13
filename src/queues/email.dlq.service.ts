import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class EmailDLQService {

  constructor(
    @InjectQueue('email-dlq')
    private dlq: Queue,
  ) {}

  async moveToDLQ(data: any, reason: string) {

    await this.dlq.add('failed-email', {
      ...data,
      reason,
      failedAt: new Date(),
    })

  }

}