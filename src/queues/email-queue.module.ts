import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { EmailProcessor } from './email.processor'
import { EmailQueueService } from './email.queue.service'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [EmailProcessor, EmailQueueService],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}