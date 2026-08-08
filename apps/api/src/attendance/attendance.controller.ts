import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentEmployeeId } from '../auth/current-employee.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { AttendanceService } from './attendance.service.js';
import type { AttendanceResponse } from './dto/attendance.response.js';

@Controller('attendance')
@UseGuards(SessionAuthGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // UC-002 AC-6.
  @Get('today')
  async today(@CurrentEmployeeId() employeeId: number): Promise<AttendanceResponse> {
    return this.service.today(employeeId);
  }

  // UC-002 Main Flow / E1 / AC-1 / AC-2.
  @Post('check-in')
  async checkIn(@CurrentEmployeeId() employeeId: number): Promise<AttendanceResponse> {
    return this.service.checkIn(employeeId);
  }

  // UC-002 A1 / E2 / E3 / AC-3..AC-5.
  @Post('check-out')
  async checkOut(@CurrentEmployeeId() employeeId: number): Promise<AttendanceResponse> {
    return this.service.checkOut(employeeId);
  }
}
