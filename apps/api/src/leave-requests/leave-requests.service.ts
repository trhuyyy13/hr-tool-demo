import { BadRequestException, Injectable } from '@nestjs/common';
import { countBusinessDays, todayDateString } from '../common/date.util.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { MailService } from '../mail/mail.service.js';
import type { CreateLeaveRequestDto } from './dto/create-leave-request.dto.js';
import type { LeaveRequestResponse } from './dto/leave-request.response.js';
import { LeaveRequestsRepository } from './leave-requests.repository.js';

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
