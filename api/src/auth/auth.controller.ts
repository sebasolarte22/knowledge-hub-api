import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common'

import { Request, Response } from 'express'

import { AuthService } from './auth.service'

import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

import { JwtAuthGuard } from './jwt-auth.guard'
import { RateLimitGuard } from './rate-limit.guard'
import { AuthenticatedRequest } from './types/jwt-payload.interface'

@Controller('auth')
export class AuthController {

  constructor(private authService: AuthService) {}

  @UseGuards(RateLimitGuard)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password)
  }

  @UseGuards(RateLimitGuard)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {

    const tokens = await this.authService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    )

    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    })

    return {
      accessToken: tokens.accessToken,
    }

  }

  @UseGuards(RateLimitGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {

    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing')
    }

    const tokens = await this.authService.refresh(refreshToken)

    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    })

    return {
      accessToken: tokens.accessToken,
    }

  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {

    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing')
    }

    // Extract access token to blacklist it in Redis
    const authHeader = req.headers.authorization
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined

    await this.authService.logout(refreshToken, accessToken)

    res.clearCookie('refreshToken', {
      path: '/',
    })

    return {
      message: 'Logged out',
    }

  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req: AuthenticatedRequest) {
    return this.authService.logoutAll(req.user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(@Req() req: AuthenticatedRequest) {
    return this.authService.getSessions(req.user.sub)
  }

}