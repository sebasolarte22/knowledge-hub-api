import { INestApplication, ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST

export function setupApp(app: INestApplication) {

  app.use(cookieParser())

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

}