import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class EventPublisher {

  constructor(
    @InjectQueue('events')
    private eventQueue: Queue,
  ) {}

  async publish(eventName: string, payload: any) {

    await this.eventQueue.add(
      eventName,
      payload,
      {
        removeOnComplete: true,
        attempts: 3,
      },
    )

  }

}