import { BadRequestException, Injectable } from '@nestjs/common';
import {
  countBusinessDays,
  isFutureMonth,
  lateMinutesAfterNine,
  monthDateRange,
} from '../common/date.util.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import type { MonthlyReportRow } from './dto/monthly-report-row.js';
import { ReportsRepository } from './reports.repository.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly employeesRepository: EmployeesRepository,
  ) {}

  // UC-006 Main Flow steps 3-4. Exceptions E1/E2 checked before touching the DB.
  async monthlyReport(year: number, month: number): Promise<MonthlyReportRow[]> {
    // E1
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Tháng không hợp lệ');
    }
    // E2
    if (isFutureMonth(year, month)) {
      throw new BadRequestException('Không thể xuất báo cáo cho tháng trong tương lai');
    }

    const { start, end } = monthDateRange(year, month);
    const [employees, attendanceRows, leaveRows] = await Promise.all([
      this.employeesRepository.findAll(),
      this.repository.findAttendanceInRange(start, end),
      this.repository.findApprovedLeaveOverlapping(start, end),
    ]);

    // AC-1/AC-3: work_days = distinct dates with a check-in; late_minutes summed per day.
    const workDatesByEmployee = new Map<number, Set<string>>();
    const lateMinutesByEmployee = new Map<number, number>();
    for (const row of attendanceRows) {
      if (!row.checkInAt) continue;
      if (!workDatesByEmployee.has(row.employeeId)) {
        workDatesByEmployee.set(row.employeeId, new Set());
      }
      workDatesByEmployee.get(row.employeeId)!.add(row.date);
      const late = lateMinutesAfterNine(row.checkInAt);
      lateMinutesByEmployee.set(row.employeeId, (lateMinutesByEmployee.get(row.employeeId) ?? 0) + late);
    }

    // AC-2: leave_days = business days of each approved request, clipped to this month.
    const leaveDaysByEmployee = new Map<number, number>();
    for (const row of leaveRows) {
      const clippedFrom = row.fromDate > start ? row.fromDate : start;
      const clippedTo = row.toDate < end ? row.toDate : end;
      const days = countBusinessDays(clippedFrom, clippedTo);
      leaveDaysByEmployee.set(row.employeeId, (leaveDaysByEmployee.get(row.employeeId) ?? 0) + days);
    }

    // AC-6: every employee appears, even with all-zero rows.
    return employees.map((employee) => ({
      employeeId: employee.id,
      fullName: employee.fullName,
      department: employee.department,
      workDays: workDatesByEmployee.get(employee.id)?.size ?? 0,
      leaveDays: leaveDaysByEmployee.get(employee.id) ?? 0,
      lateMinutes: lateMinutesByEmployee.get(employee.id) ?? 0,
    }));
  }
}
