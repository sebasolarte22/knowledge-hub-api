import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { EmailDLQService } from './email.dlq.service'

@Processor('email', {
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class EmailProcessor extends WorkerHost {

  constructor(private dlqService: EmailDLQService) {
    super()
  }

  async process(job: Job) {

    if (job.name === 'send-welcome-email') {

      const { email } = job.data

      console.log('Sending welcome email to:', email)

      // fail simulation
      if (Math.random() < 0.5) {
        throw new Error('Simulated email failure')
      }

      console.log('Email sent successfully')

    }

  }

  async onFailed(job: Job, err: Error) {

    console.log('Job failed:', err.message)

    if (job.opts.attempts && job.attemptsMade >= job.opts.attempts) {

      console.log('Moving job to DLQ')

      await this.dlqService.moveToDLQ(job.data, err.message)

    }

  }

}