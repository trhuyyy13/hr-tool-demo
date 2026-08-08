import { BadRequestException, Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import type { MonthlyReportRow } from './dto/monthly-report-row.js';
import { ReportsService } from './reports.service.js';

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(rows: MonthlyReportRow[]): string {
  const header = 'employee_id,full_name,department,work_days,leave_days,late_minutes';
  const lines = rows.map((row) =>
    [
      row.employeeId,
      csvEscape(row.fullName),
      csvEscape(row.department),
      row.workDays,
      row.leaveDays,
      row.lateMinutes,
    ].join(','),
  );
  return [header, ...lines].join('\n');
}

// UC-006 — demo scope allows any logged-in employee, not HR-only (see the
// use case's Preconditions: Employee has no `role` column yet).
@Controller('reports')
@UseGuards(SessionAuthGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('monthly')
  async monthly(
    @Query('year') yearParam: string,
    @Query('month') monthParam: string,
    @Res() res: Response,
  ): Promise<void> {
    const year = Number(yearParam);
    const month = Number(monthParam);
    if (!Number.isInteger(year)) {
      throw new BadRequestException('Năm không hợp lệ');
    }

    const rows = await this.service.monthlyReport(year, month);
    const csv = toCsv(rows);
    const filename = `monthly-report-${year}-${String(month).padStart(2, '0')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
