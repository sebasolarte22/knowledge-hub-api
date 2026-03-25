import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { mkdirSync } from 'fs'

import cookieParser from 'cookie-parser'
import csurf from 'csurf'

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap() {

  mkdirSync('logs', { recursive: true })

  const app = await NestFactory.create(AppModule)

  // VALIDATION
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
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

  // SWAGGER (solo dev)
  if (process.env.NODE_ENV !== 'production') {

    const config = new DocumentBuilder()
      .setTitle('Knowledge Hub API')
      .setDescription('Backend API for managing developer resources')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)

    SwaggerModule.setup('docs', app, document)
  }

  await app.listen(process.env.PORT || 4000)
}

bootstrap()