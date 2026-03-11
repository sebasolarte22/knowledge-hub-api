import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

import cookieParser from 'cookie-parser'
import csurf from 'csurf'

async function bootstrap() {

  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.use(cookieParser())

  app.use(
    csurf({
      cookie: true,
    }),
  )

  await app.listen(4000)

}

bootstrap()