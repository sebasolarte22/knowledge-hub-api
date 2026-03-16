import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('events')
export class EventProcessor extends WorkerHost {

  async process(job: Job) {

    if (job.name === 'USER_CREATED') {

      const { email } = job.data

      console.log('User created event received')

      console.log('Send welcome email to:', email)

    }

  }

}