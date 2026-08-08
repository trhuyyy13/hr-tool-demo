import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

function toISODate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(d);
}

/** Next Monday from today (or +7d if today is already Monday) — see seed notes. */
function nextMonday(from = new Date()): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const daysUntilMonday = ((1 - day + 7) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  return d;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function seed() {
  console.log('Seeding: truncating employee, leave_request...');
  await db.execute(sql`TRUNCATE TABLE leave_request, employee RESTART IDENTITY CASCADE`);

  const [minh] = await db
    .insert(schema.employee)
    .values({
      fullName: 'Nguyễn Văn Minh',
      email: 'minh.nguyen@company.com',
      department: 'Engineering',
      managerId: null,
      annualLeaveBalance: 10,
      startDate: '2020-01-06',
    })
    .returning();

  const [ha, lan, hung, mai, nam] = await db
    .insert(schema.employee)
    .values([
      {
        // UC-005 E5 fallback approver — HR_DIRECTOR_EMAIL defaults to her
        // email, so Minh (no manager) always has someone to approve his leave.
        fullName: 'Phạm Thị Hà',
        email: 'ha.pham@company.com',
        department: 'HR',
        managerId: null,
        annualLeaveBalance: 12,
        startDate: '2019-05-01',
      },
      {
        fullName: 'Trần Thị Lan',
        email: 'lan.tran@company.com',
        department: 'Engineering',
        managerId: minh.id,
        annualLeaveBalance: 8,
        startDate: '2022-03-14',
      },
      {
        fullName: 'Lê Văn Hùng',
        email: 'hung.le@company.com',
        department: 'Engineering',
        managerId: minh.id,
        annualLeaveBalance: 2,
        startDate: '2023-06-01',
      },
      {
        fullName: 'Phạm Thị Mai',
        email: 'mai.pham@company.com',
        department: 'Engineering',
        managerId: minh.id,
        annualLeaveBalance: 8,
        startDate: '2021-09-20',
      },
      {
        fullName: 'Hoàng Văn Nam',
        email: 'nam.hoang@company.com',
        department: 'Sales',
        managerId: minh.id,
        annualLeaveBalance: 0,
        startDate: '2024-02-12',
      },
    ])
    .returning();

  // Mai has a pending request Mon->Wed of next week, so AC-4 (overlap) is
  // exercisable by hand regardless of when the seed runs — hardcoding the
  // AC's literal 2025-03 dates would make E1 (past date) fire first once
  // that week has passed.
  const monday = nextMonday();
  const wednesday = addDays(monday, 2);
  await db.insert(schema.leaveRequest).values({
    employeeId: mai.id,
    type: 'annual',
    fromDate: toISODate(monday),
    toDate: toISODate(wednesday),
    reason: 'Về quê thăm gia đình',
    status: 'pending',
  });

  console.log('Seeded employees:');
  console.log(`  ${minh.id} Minh (manager, no manager, balance 10)`);
  console.log(`  ${ha.id} Hà (HR Director, no manager, balance 12) — try UC-005 AC-8`);
  console.log(`  ${lan.id} Lan (balance 8) — try AC-1`);
  console.log(`  ${hung.id} Hùng (balance 2) — try AC-3`);
  console.log(`  ${mai.id} Mai (balance 8, pending ${toISODate(monday)}..${toISODate(wednesday)}) — try AC-4`);
  console.log(`  ${nam.id} Nam (balance 0) — try AC-5 (sick)`);

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
