import { BadRequestException, Injectable } from '@nestjs/common';
import { formatTimeVN, todayDateString } from '../common/date.util.js';
import { AttendanceRepository } from './attendance.repository.js';
import type { AttendanceResponse } from './dto/attendance.response.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly repository: AttendanceRepository) {}

  // UC-002 AC-6: no record yet today -> both timestamps null.
  async today(employeeId: number): Promise<AttendanceResponse> {
    const row = await this.repository.findToday(employeeId);
    return this.toResponse(row);
  }

  // UC-002 Main Flow steps 3-5 / E1 / AC-1 / AC-2.
  async checkIn(employeeId: number): Promise<AttendanceResponse> {
    const result = await this.repository.checkIn(employeeId);
    if (result.kind === 'already-checked-in') {
      throw new BadRequestException(
        `Bạn đã chấm công vào lúc ${formatTimeVN(result.row.checkInAt!)} hôm nay`,
      );
    }
    return this.toResponse(result.row);
  }

  // UC-002 Alt Flow A1 / E2 / E3 / AC-3 / AC-4 / AC-5.
  async checkOut(employeeId: number): Promise<AttendanceResponse> {
    const result = await this.repository.checkOut(employeeId);
    if (result.kind === 'not-checked-in') {
      throw new BadRequestException('Bạn chưa chấm công vào, không thể chấm công ra');
    }
    if (result.kind === 'already-checked-out') {
      throw new BadRequestException(
        `Bạn đã chấm công ra lúc ${formatTimeVN(result.row.checkOutAt!)} hôm nay`,
      );
    }
    return this.toResponse(result.row);
  }

  private toResponse(row?: {
    date: string;
    checkInAt: Date | null;
    checkOutAt: Date | null;
  }): AttendanceResponse {
    return {
      date: row?.date ?? todayDateString(),
      checkInAt: row?.checkInAt ? row.checkInAt.toISOString() : null,
      checkOutAt: row?.checkOutAt ? row.checkOutAt.toISOString() : null,
    };
  }
}
