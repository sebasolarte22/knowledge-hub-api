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
import { AuthRequest } from '../types/express'

@Controller('auth')
export class AuthController {

  constructor(private authService: AuthService) {}

  // REGISTER

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: AuthRequest) {
    return this.authService.register(
      dto.email,
      dto.password,
      req.requestId, 
    )
  }

  // LOGIN

  @UseGuards(RateLimitGuard)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {

    const tokens = await this.authService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'] || 'unknown',
      req.requestId, 
    )

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      path: '/',
    })

    return {
      accessToken: tokens.accessToken,
    }
  }

  // REFRESH

  @Post('refresh')
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {

    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing')
    }

    const tokens = await this.authService.refresh(
      refreshToken,
      req.requestId, 
    )

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return {
      accessToken: tokens.accessToken,
    }
  }

  // LOGOUT

  @Post('logout')
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {

    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing')
    }

    await this.authService.logout(
      refreshToken,
      req.requestId, 
    )

    res.clearCookie('refreshToken', {
      path: '/',
    })

    return {
      message: 'Logged out',
    }
  }

  // LOGOUT ALL

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req: AuthRequest) {
    return this.authService.logoutAll(
      req.user.sub,
      req.requestId, 
    )
  }

  // SESSIONS

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(@Req() req: AuthRequest) {
    return this.authService.getSessions(req.user.sub)
  }

}