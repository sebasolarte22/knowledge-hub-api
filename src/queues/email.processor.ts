import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('email')
export class EmailProcessor extends WorkerHost {

  async process(job: Job) {

    if (job.name === 'send-welcome-email') {

      const { email } = job.data

      console.log('Sending welcome email to:', email)

      // aquí después pondrías nodemailer
    }

  }

}