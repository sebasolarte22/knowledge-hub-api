import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { EmailProcessor } from './email.processor'
import { EmailDLQService } from './email.dlq.service'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),

    BullModule.registerQueue(
      {
        name: 'email',
      },
      {
        name: 'email-dlq',
      },
    ),
  ],

  providers: [
    EmailProcessor,
    EmailDLQService,
  ],
})
export class WorkerModule {}