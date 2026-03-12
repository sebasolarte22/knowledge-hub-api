import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}