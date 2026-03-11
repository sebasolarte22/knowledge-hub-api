import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

import cookieParser from 'cookie-parser'
import csurf from 'csurf'

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

async function bootstrap() {

  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }))

  app.use(cookieParser())

  // CSRF only in production
  if (process.env.NODE_ENV === 'production') {
    app.use(
      csurf({
        cookie: true,
      }),
    )
  }

  // Swagger only in development
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