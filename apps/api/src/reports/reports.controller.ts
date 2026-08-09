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
    // Bounded, not just "is a number": year=0 (or "" -> Number('') === 0)
    // and negative years produce a malformed "0-08-01"-style date string
    // that Postgres rejects with an uncaught 22008 error, leaking a raw
    // 500 instead of this validation message.
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
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
