import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { mkdirSync } from 'fs'

import cookieParser from 'cookie-parser'
import csurf from 'csurf'
import helmet from 'helmet'
import * as express from 'express'

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap() {

  mkdirSync('logs', { recursive: true })

  const app = await NestFactory.create(AppModule)

  // SECURITY HEADERS
  app.use(helmet())

  // BODY SIZE LIMIT
  app.use(express.json({ limit: '10kb' }))
  app.use(express.urlencoded({ extended: true, limit: '10kb' }))

  // VALIDATION
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }))

  // COOKIES
  app.use(cookieParser())

  // CSRF (solo producción)
  if (process.env.NODE_ENV === 'production') {
    app.use(
      csurf({
        cookie: true,
      }),
    )
  }

  // RESPONSE STANDARDIZATION
  app.useGlobalInterceptors(new ResponseInterceptor())

  // SWAGGER
  const config = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('Backend API for managing developer resources')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)

  SwaggerModule.setup('docs', app, document)

  await app.listen(process.env.PORT || 4000)
}

bootstrap()