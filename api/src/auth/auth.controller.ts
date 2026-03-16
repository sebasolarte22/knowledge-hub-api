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

@Controller('auth')
export class AuthController {

  constructor(private authService: AuthService) {}

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

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    })

    return {
      accessToken: tokens.accessToken,
    }

  }

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

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
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

    await this.authService.logout(refreshToken)

    res.clearCookie('refreshToken', {
      path: '/',
    })

    return {
      message: 'Logged out',
    }

  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req) {
    return this.authService.logoutAll(req.user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(@Req() req) {
    return this.authService.getSessions(req.user.sub)
  }

}