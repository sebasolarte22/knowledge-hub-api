import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { EmailQueueService } from './email.queue.service'

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
      {
        name: 'events',
      },
    ),
  ],

  providers: [
    EmailQueueService,
  ],

  exports: [
    EmailQueueService,
  ],
})
export class QueueModule {}