import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Entity model: specs/entities/entity-model.md#employee
export const employee = pgTable(
  'employee',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    fullName: text('full_name').notNull(),
    email: text().notNull(),
    department: text().notNull(),
    // Self-referencing FK: direct manager. Nullable — the top of the org has none.
    managerId: integer('manager_id').references((): AnyPgColumn => employee.id),
    annualLeaveBalance: integer('annual_leave_balance').notNull().default(12),
    startDate: date('start_date', { mode: 'string' }).notNull(),
  },
  (table) => [uniqueIndex('idx_employee_email').on(table.email)],
);

// Entity model: specs/entities/entity-model.md#leaverequest
// UC-004 scope only (Employee + LeaveRequest) — ApprovalLog is UC-005's.
export const leaveRequest = pgTable(
  'leave_request',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employee.id),
    type: text().notNull(),
    // string mode: keeps 'YYYY-MM-DD' comparable lexicographically for E1/E2/E4
    fromDate: date('from_date', { mode: 'string' }).notNull(),
    toDate: date('to_date', { mode: 'string' }).notNull(),
    reason: text().notNull(),
    status: text().notNull().default('pending'),
    // Filled in by UC-005 (approve/reject) — out of scope here, stay nullable.
    approverId: integer('approver_id').references(() => employee.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectReason: text('reject_reason'),
  },
  (table) => [
    check('leave_request_type_check', sql`${table.type} in ('annual','sick','unpaid')`),
    check(
      'leave_request_status_check',
      sql`${table.status} in ('pending','approved','rejected','cancelled')`,
    ),
  ],
);

// Entity model: specs/entities/entity-model.md#attendance
// UC-002 scope: check-in/check-out only. Exactly 1 row per employee per day.
export const attendance = pgTable(
  'attendance',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employee.id),
    // string mode, same reasoning as leaveRequest's date columns.
    date: date('date', { mode: 'string' }).notNull(),
    checkInAt: timestamp('check_in_at', { withTimezone: true }),
    checkOutAt: timestamp('check_out_at', { withTimezone: true }),
    source: text().notNull().default('web'),
  },
  (table) => [
    uniqueIndex('idx_attendance_employee_date').on(table.employeeId, table.date),
    check('attendance_source_check', sql`${table.source} in ('web','manual_by_hr')`),
  ],
);
