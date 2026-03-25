import { Request } from 'express'

export interface JwtPayload {
  sub: number
  email: string
  role: string
  exp?: number
  iat?: number
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload
}
