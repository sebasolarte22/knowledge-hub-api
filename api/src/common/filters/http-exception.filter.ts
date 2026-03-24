import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Inject,
  LoggerService,
} from '@nestjs/common'

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {

    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = 500
    let message = 'Internal server error'
    let stack: string | undefined

    // 🔹 manejar HttpException
    if (exception instanceof HttpException) {

      status = exception.getStatus()

      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message
      }

      stack = exception.stack

    } else if (exception instanceof Error) {
      // 🔹 errores normales (no HttpException)
      message = exception.message
      stack = exception.stack
    }

    // LOG COMPLETO
    this.logger.error('HTTP Exception', {
      message,
      statusCode: status,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    })

    // RESPUESTA AL CLIENTE
    response.status(status).json({
      success: false,
      error: {
        message,
        statusCode: status,
        path: request.url,
      },
      timestamp: new Date().toISOString(),
    })
  }
}