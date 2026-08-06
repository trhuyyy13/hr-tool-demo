import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto.js';
import type { LeaveRequestResponse } from './dto/leave-request.response.js';
import { LeaveRequestsService } from './leave-requests.service.js';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  @Post()
  async create(
    // DEMO AUTH — no real session exists yet (UC-001 not built). The caller
    // fully controls this header, so it must never be trusted outside local
    // demo use; main.ts refuses to boot at all when NODE_ENV=production so
    // this can't silently reach a real deployment. Replace with the
    // authenticated user's id (e.g. req.user.id) once UC-001 exists — the
    // service signature below does not need to change.
    @Headers('x-demo-employee-id') employeeIdHeader: string,
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestResponse> {
    const employeeId = Number(employeeIdHeader);
    if (!employeeIdHeader || Number.isNaN(employeeId)) {
      throw new BadRequestException(
        'Thiếu thông tin nhân viên đăng nhập (demo header x-demo-employee-id)',
      );
    }
    return this.service.create(employeeId, dto);
  }
}
