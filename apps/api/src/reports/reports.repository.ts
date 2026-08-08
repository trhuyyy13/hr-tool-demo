import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, lte } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/drizzle.provider.js';
import { attendance, leaveRequest } from '../database/schema.js';

@Injectable()
export class ReportsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAttendanceInRange(startDate: string, endDate: string) {
    return this.db
      .select()
      .from(attendance)
      .where(and(gte(attendance.date, startDate), lte(attendance.date, endDate)));
  }

  async findApprovedLeaveOverlapping(startDate: string, endDate: string) {
    return this.db
      .select()
      .from(leaveRequest)
      .where(
        and(
          eq(leaveRequest.status, 'approved'),
          lte(leaveRequest.fromDate, endDate),
          gte(leaveRequest.toDate, startDate),
        ),
      );
  }
}
