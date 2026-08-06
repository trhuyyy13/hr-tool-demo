import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/drizzle.provider.js';
import { leaveRequest } from '../database/schema.js';

type CreateLeaveRequestValues = {
  employeeId: number;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
};

export type CreateResult =
  | { kind: 'created'; row: typeof leaveRequest.$inferSelect }
  | { kind: 'overlap' };

@Injectable()
export class LeaveRequestsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * E4 (UC-004) + insert, done atomically. Codex adversarial review flagged
   * that a separate check-then-insert lets two concurrent submissions both
   * see "no overlap" and both write — so this locks per-employee for the
   * duration of the transaction (pg_advisory_xact_lock, released
   * automatically on commit/rollback) before re-checking overlap and
   * inserting, serializing writes for the same employee without locking
   * the whole table.
   */
  async createIfNoOverlap(values: CreateLeaveRequestValues): Promise<CreateResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${values.employeeId})`);

      const overlapping = await tx
        .select()
        .from(leaveRequest)
        .where(
          and(
            eq(leaveRequest.employeeId, values.employeeId),
            inArray(leaveRequest.status, ['pending', 'approved']),
            lte(leaveRequest.fromDate, values.toDate),
            gte(leaveRequest.toDate, values.fromDate),
          ),
        );

      if (overlapping.length > 0) {
        return { kind: 'overlap' as const };
      }

      const rows = await tx
        .insert(leaveRequest)
        .values({ ...values, status: 'pending' })
        .returning();
      return { kind: 'created' as const, row: rows[0] };
    });
  }
}
