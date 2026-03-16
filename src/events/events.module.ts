import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

import { EventPublisher } from './event.publisher'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'events',
    }),
  ],

  providers: [EventPublisher],

  exports: [EventPublisher],
})
export class EventsModule {}