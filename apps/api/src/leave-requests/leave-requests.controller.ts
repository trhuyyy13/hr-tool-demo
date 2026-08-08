import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentEmployeeId } from '../auth/current-employee.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto.js';
import type { LeaveRequestResponse } from './dto/leave-request.response.js';
import type { PendingLeaveRequestResponse } from './dto/pending-leave-request.response.js';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto.js';
import { LeaveRequestsService } from './leave-requests.service.js';

// UC-001 retrofit: identity now comes from the session cookie (set by
// POST /auth/login), not a caller-supplied header — closes the
// impersonation gap the adversarial review flagged on the old header.
@Controller('leave-requests')
@UseGuards(SessionAuthGuard)
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  @Post()
  async create(
    @CurrentEmployeeId() employeeId: number,
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestResponse> {
    return this.service.create(employeeId, dto);
  }

  // UC-005 Main Flow step 1.
  @Get('pending')
  async listPending(@CurrentEmployeeId() managerId: number): Promise<PendingLeaveRequestResponse[]> {
    return this.service.listPendingForManager(managerId);
  }

  // UC-005 Main Flow / AC-1 / AC-2.
  @Post(':id/approve')
  async approve(
    @CurrentEmployeeId() managerId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LeaveRequestResponse> {
    return this.service.approve(managerId, id);
  }

  // UC-005 A1 / AC-3 / AC-4.
  @Post(':id/reject')
  async reject(
    @CurrentEmployeeId() managerId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectLeaveRequestDto,
  ): Promise<LeaveRequestResponse> {
    return this.service.reject(managerId, id, dto);
  }
}
