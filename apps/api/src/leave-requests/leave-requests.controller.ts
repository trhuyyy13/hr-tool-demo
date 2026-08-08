import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentEmployeeId } from '../auth/current-employee.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto.js';
import type { LeaveRequestResponse } from './dto/leave-request.response.js';
import { LeaveRequestsService } from './leave-requests.service.js';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  // UC-001 retrofit: identity now comes from the session cookie (set by
  // POST /auth/login), not a caller-supplied header — closes the
  // impersonation gap the adversarial review flagged on the old header.
  @Post()
  @UseGuards(SessionAuthGuard)
  async create(
    @CurrentEmployeeId() employeeId: number,
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestResponse> {
    return this.service.create(employeeId, dto);
  }
}
