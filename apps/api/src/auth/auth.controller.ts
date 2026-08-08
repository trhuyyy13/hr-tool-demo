import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { CurrentEmployeeId } from './current-employee.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import type { SessionEmployeeResponse } from './dto/session-employee.response.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { SESSION_COOKIE_MAX_AGE_MS, SESSION_COOKIE_NAME } from './session.util.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  // UC-001 Main Flow steps 4-6 (Google step replaced by the demo picker —
  // see auth.service.ts). E1 on unknown email.
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionEmployeeResponse> {
    const { token, employee } = await this.service.login(dto.email);
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });
    return employee;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(SESSION_COOKIE_NAME);
    return { ok: true };
  }

  // UC-001 A1 / E4 — the frontend calls this on mount to decide: already
  // signed in (skip the picker) vs. session missing/expired (show it).
  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@CurrentEmployeeId() employeeId: number): Promise<SessionEmployeeResponse> {
    return this.service.me(employeeId);
  }
}
