import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/drizzle.provider.js';
import { attendance } from '../database/schema.js';
import { todayDateString } from '../common/date.util.js';

export type CheckInResult =
  | { kind: 'created'; row: typeof attendance.$inferSelect }
  | { kind: 'already-checked-in'; row: typeof attendance.$inferSelect };

export type CheckOutResult =
  | { kind: 'updated'; row: typeof attendance.$inferSelect }
  | { kind: 'not-checked-in' }
  | { kind: 'already-checked-out'; row: typeof attendance.$inferSelect };

@Injectable()
export class AttendanceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findToday(employeeId: number) {
    const rows = await this.db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, todayDateString())))
      .limit(1);
    return rows[0];
  }

  // E1/AC-2 (UC-002): check-then-insert done atomically, same
  // pg_advisory_xact_lock pattern as leave-requests — avoids a double
  // check-in from two concurrent clicks racing past a separate check.
  async checkIn(employeeId: number): Promise<CheckInResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${employeeId})`);

      const today = todayDateString();
      const existing = await tx
        .select()
        .from(attendance)
        .where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, today)))
        .limit(1);

      if (existing[0]?.checkInAt) {
        return { kind: 'already-checked-in' as const, row: existing[0] };
      }

      const rows = await tx
        .insert(attendance)
        .values({ employeeId, date: today, checkInAt: new Date(), source: 'web' })
        .returning();
      return { kind: 'created' as const, row: rows[0] };
    });
  }

  // E2/E3/AC-3..AC-5: same atomic check-then-update.
  async checkOut(employeeId: number): Promise<CheckOutResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${employeeId})`);

      const today = todayDateString();
      const existing = await tx
        .select()
        .from(attendance)
        .where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, today)))
        .limit(1);

      if (!existing[0]?.checkInAt) {
        return { kind: 'not-checked-in' as const };
      }
      if (existing[0].checkOutAt) {
        return { kind: 'already-checked-out' as const, row: existing[0] };
      }

      const rows = await tx
        .update(attendance)
        .set({ checkOutAt: new Date() })
        .where(eq(attendance.id, existing[0].id))
        .returning();
      return { kind: 'updated' as const, row: rows[0] };
    });
  }
}
