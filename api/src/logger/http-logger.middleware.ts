import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import morgan from 'morgan'

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {

  private logger = morgan(
    ':method :url :status :res[content-length] - :response-time ms'
  )

  use(req: Request, res: Response, next: NextFunction) {
    this.logger(req, res, next)
  }

}