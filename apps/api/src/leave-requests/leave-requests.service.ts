import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { countBusinessDays, todayDateString } from '../common/date.util.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { MailService } from '../mail/mail.service.js';
import type { CreateLeaveRequestDto } from './dto/create-leave-request.dto.js';
import type { LeaveRequestResponse } from './dto/leave-request.response.js';
import type { PendingLeaveRequestResponse } from './dto/pending-leave-request.response.js';
import type { RejectLeaveRequestDto } from './dto/reject-leave-request.dto.js';
import { LeaveRequestsRepository, type DecideResult } from './leave-requests.repository.js';

const NOT_PENDING_MESSAGE = 'Yêu cầu không tồn tại hoặc đã được xử lý';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly repository: LeaveRequestsRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly mailService: MailService,
  ) {}

  // UC-004 Main Flow steps 3-6. Validation order follows the spec's
  // Exceptions E1-E4; each throws with the exact message from its
  // Acceptance Criteria so the frontend can render it verbatim.
  async create(employeeId: number, dto: CreateLeaveRequestDto): Promise<LeaveRequestResponse> {
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      throw new BadRequestException('Nhân viên không tồn tại');
    }

    // E1
    if (dto.fromDate < todayDateString()) {
      throw new BadRequestException('Không thể xin nghỉ ngày quá khứ');
    }

    // E2
    if (dto.toDate < dto.fromDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    // E3 — only annual leave checks the balance (AC-5: sick bypasses it)
    if (dto.type === 'annual') {
      const businessDays = countBusinessDays(dto.fromDate, dto.toDate);
      if (businessDays > employee.annualLeaveBalance) {
        throw new BadRequestException(`Số ngày phép còn lại: ${employee.annualLeaveBalance}`);
      }
    }

    // TODO(UC-004 Alternative Flow 4a): sick leave + file attachment is not
    // implemented — entity model has no attachment column yet.

    // E4 + insert, atomic (see repository — closes the race the adversarial
    // review flagged in the original check-then-insert version).
    const result = await this.repository.createIfNoOverlap({
      employeeId,
      type: dto.type,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      reason: dto.reason,
    });

    if (result.kind === 'overlap') {
      throw new BadRequestException('Đã có yêu cầu nghỉ chồng lấn thời gian');
    }

    const row = result.row;

    // AC-1: balance is NOT decremented here — only on approval (UC-005).
    if (employee.managerId) {
      const manager = await this.employeesRepository.findById(employee.managerId);
      if (manager) {
        await this.mailService.sendLeaveApprovalRequest({
          to: manager.email,
          leaveRequestId: row.id,
          employeeName: employee.fullName,
          fromDate: row.fromDate,
          toDate: row.toDate,
        });
      }
    }

    return this.toResponse(row);
  }

  // UC-005 Main Flow step 1 — requests from this manager's direct reports only.
  async listPendingForManager(managerId: number): Promise<PendingLeaveRequestResponse[]> {
    const rows = await this.repository.findPendingForManager(managerId);
    return rows.map(({ leave_request, employee }) => ({
      ...this.toResponse(leave_request),
      employeeName: employee.fullName,
    }));
  }

  // UC-005 Main Flow / AC-1 / AC-2.
  async approve(managerId: number, leaveRequestId: number): Promise<LeaveRequestResponse> {
    return this.decide(managerId, leaveRequestId, 'approved');
  }

  // UC-005 A1 / E3 / AC-3 / AC-4.
  async reject(
    managerId: number,
    leaveRequestId: number,
    dto: RejectLeaveRequestDto,
  ): Promise<LeaveRequestResponse> {
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Cần nhập lý do từ chối');
    }
    return this.decide(managerId, leaveRequestId, 'rejected', dto.reason);
  }

  private async decide(
    managerId: number,
    leaveRequestId: number,
    decision: 'approved' | 'rejected',
    rejectReason?: string,
  ): Promise<LeaveRequestResponse> {
    const existing = await this.repository.findById(leaveRequestId);
    if (!existing) {
      throw new BadRequestException(NOT_PENDING_MESSAGE);
    }

    // E1 — must be the requester's direct manager.
    const employee = await this.employeesRepository.findById(existing.employeeId);
    if (!employee || employee.managerId !== managerId) {
      throw new ForbiddenException('Bạn không có quyền duyệt yêu cầu này');
    }

    const businessDays =
      existing.type === 'annual' ? countBusinessDays(existing.fromDate, existing.toDate) : 0;

    // E2/E4 + the actual status/balance/ApprovalLog update, atomic (see repository).
    const result: DecideResult = await this.repository.decide({
      leaveRequestId,
      employeeId: existing.employeeId,
      managerId,
      decision,
      businessDays,
      rejectReason,
    });

    if (result.kind === 'not-pending') {
      throw new BadRequestException(NOT_PENDING_MESSAGE);
    }
    if (result.kind === 'insufficient-balance') {
      throw new BadRequestException(`Số ngày phép còn lại: ${result.balance}`);
    }

    return this.toResponse(result.row);
  }

  private toResponse(row: {
    id: number;
    employeeId: number;
    type: string;
    fromDate: string;
    toDate: string;
    reason: string;
    status: string;
  }): LeaveRequestResponse {
    return {
      id: row.id,
      employeeId: row.employeeId,
      type: row.type,
      fromDate: row.fromDate,
      toDate: row.toDate,
      reason: row.reason,
      status: row.status,
    };
  }
}
