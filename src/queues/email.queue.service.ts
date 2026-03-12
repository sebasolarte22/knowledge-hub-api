import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class EmailQueueService {

  constructor(
    @InjectQueue('email')
    private emailQueue: Queue,
  ) {}

  async sendWelcomeEmail(email: string) {

    await this.emailQueue.add(
      'send-welcome-email',
      { email },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    )

  }

}