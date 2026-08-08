import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmployeesRepository } from '../employees/employees.repository.js';
import type { SessionEmployeeResponse } from './dto/session-employee.response.js';
import { signSession } from './session.util.js';

// UC-001 E1's exact message.
const UNKNOWN_ACCOUNT_MESSAGE = 'Tài khoản này chưa được cấp quyền truy cập hệ thống';

@Injectable()
export class AuthService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  // Main Flow steps 4-6. `email` stands in for what Google would return as
  // the verified email (E2/E3 — cancel and unverified-email — are Google-side
  // behaviors with no demo equivalent, deferred until real OAuth).
  async login(email: string): Promise<{ token: string; employee: SessionEmployeeResponse }> {
    const employee = await this.employeesRepository.findByEmail(email);
    if (!employee) {
      throw new UnauthorizedException(UNKNOWN_ACCOUNT_MESSAGE);
    }
    return { token: signSession(employee.id), employee: this.toResponse(employee) };
  }

  async me(employeeId: number): Promise<SessionEmployeeResponse> {
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      throw new UnauthorizedException(UNKNOWN_ACCOUNT_MESSAGE);
    }
    return this.toResponse(employee);
  }

  private toResponse(employee: {
    id: number;
    fullName: string;
    email: string;
    department: string;
    annualLeaveBalance: number;
  }): SessionEmployeeResponse {
    return {
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      annualLeaveBalance: employee.annualLeaveBalance,
    };
  }
}
