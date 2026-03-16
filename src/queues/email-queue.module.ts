import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { EmailQueueService } from './email.queue.service'

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'email',
      },
      {
        name: 'email-dlq',
      },
    ),
  ],
  providers: [EmailQueueService],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}