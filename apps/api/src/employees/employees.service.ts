import { Injectable } from '@nestjs/common';
import { EmployeesRepository } from './employees.repository.js';
import type { EmployeeResponse } from './dto/employee.response.js';
import { computeRole } from './role.util.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  async listAll(): Promise<EmployeeResponse[]> {
    const rows = await this.repository.findAll();
    return rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      department: row.department,
      managerId: row.managerId,
      annualLeaveBalance: row.annualLeaveBalance,
      role: computeRole(row, rows),
    }));
  }
}
