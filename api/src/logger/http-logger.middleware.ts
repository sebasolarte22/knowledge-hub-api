import {
  Injectable,
  NestMiddleware,
  Inject,
  LoggerService,
} from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {

    const start = Date.now()

    res.on('finish', () => {

      const duration = Date.now() - start

      this.logger.log('HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        contentLength: res.getHeader('content-length'),
        responseTime: `${duration}ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
    })

    next()
  }
}