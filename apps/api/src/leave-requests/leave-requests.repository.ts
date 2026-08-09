import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/drizzle.provider.js';
import { approvalLog, employee, leaveRequest } from '../database/schema.js';

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

type DecideValues = {
  leaveRequestId: number;
  employeeId: number;
  managerId: number;
  decision: 'approved' | 'rejected';
  businessDays: number;
  rejectReason?: string;
};

export type DecideResult =
  | { kind: 'not-pending' }
  | { kind: 'insufficient-balance'; balance: number }
  | { kind: 'decided'; row: typeof leaveRequest.$inferSelect };

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

  async findById(id: number) {
    const rows = await this.db.select().from(leaveRequest).where(eq(leaveRequest.id, id)).limit(1);
    return rows[0];
  }

  // E5: the HR Director fallback also decides for employees with no
  // manager (`resolveApprover`), so her pending list must surface those
  // requests too — not just direct reports — or AC-8 is undeckable from
  // the UI even though `decide()` already permits it.
  async findPendingForManager(managerId: number, isHrDirector: boolean) {
    const requesterCondition = isHrDirector
      ? or(eq(employee.managerId, managerId), isNull(employee.managerId))
      : eq(employee.managerId, managerId);
    return this.db
      .select()
      .from(leaveRequest)
      .innerJoin(employee, eq(leaveRequest.employeeId, employee.id))
      .where(and(eq(leaveRequest.status, 'pending'), requesterCondition));
  }

  /**
   * UC-005 E2/E4 + status update (+ balance debit on approved annual leave)
   * + ApprovalLog insert, all atomic. Same pg_advisory_xact_lock pattern as
   * createIfNoOverlap — re-checks "still pending" and the current balance
   * inside the lock so two approvals racing on the same request (or two
   * approvals racing down the same employee's balance) can't both succeed.
   */
  async decide(values: DecideValues): Promise<DecideResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${values.employeeId})`);

      const rows = await tx
        .select()
        .from(leaveRequest)
        .where(and(eq(leaveRequest.id, values.leaveRequestId), eq(leaveRequest.status, 'pending')))
        .limit(1);
      const existing = rows[0];
      if (!existing) {
        return { kind: 'not-pending' as const };
      }

      if (values.decision === 'approved' && existing.type === 'annual') {
        const empRows = await tx.select().from(employee).where(eq(employee.id, values.employeeId)).limit(1);
        const balance = empRows[0]!.annualLeaveBalance;
        if (values.businessDays > balance) {
          return { kind: 'insufficient-balance' as const, balance };
        }
        await tx
          .update(employee)
          .set({ annualLeaveBalance: balance - values.businessDays })
          .where(eq(employee.id, values.employeeId));
      }

      const updated = await tx
        .update(leaveRequest)
        .set({
          status: values.decision,
          approverId: values.managerId,
          approvedAt: new Date(),
          ...(values.decision === 'rejected' ? { rejectReason: values.rejectReason } : {}),
        })
        .where(eq(leaveRequest.id, values.leaveRequestId))
        .returning();

      await tx.insert(approvalLog).values({
        leaveRequestId: values.leaveRequestId,
        fromStatus: 'pending',
        toStatus: values.decision,
        changedBy: values.managerId,
      });

      return { kind: 'decided' as const, row: updated[0] };
    });
  }
}
