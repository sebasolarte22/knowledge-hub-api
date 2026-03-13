import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { EmailQueueService } from './email.queue.service'
import { EmailProcessor } from './email.processor'
import { EmailDLQService } from './email.dlq.service'

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
  providers: [
    EmailQueueService,
    EmailProcessor,
    EmailDLQService,
  ],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}