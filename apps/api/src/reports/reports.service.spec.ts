import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';

// Same approach as leave-requests.service.spec.ts — mock the date math so
// assertions don't depend on the real calendar/clock, and so we control
// exactly which check-ins count as "late" per test.
jest.unstable_mockModule('../common/date.util.js', () => ({
  monthDateRange: jest.fn(() => ({ start: '2025-03-01', end: '2025-03-31' })),
  isFutureMonth: jest.fn(() => false),
  countBusinessDays: jest.fn(() => 3),
  lateMinutesAfterNine: jest.fn(() => 0),
}));

const { ReportsService } = await import('./reports.service.js');
const { isFutureMonth, countBusinessDays, lateMinutesAfterNine } = await import('../common/date.util.js');

const LAN = { id: 2, fullName: 'Trần Thị Lan', department: 'Engineering' };
const HUNG = { id: 3, fullName: 'Lê Văn Hùng', department: 'Engineering' };

function makeRepository(overrides: { findAttendanceInRange?: any; findApprovedLeaveOverlapping?: any } = {}) {
  return {
    findAttendanceInRange: jest.fn(async () => []),
    findApprovedLeaveOverlapping: jest.fn(async () => []),
    ...overrides,
  };
}

function makeEmployeesRepository(employees: Array<{ id: number; fullName: string; department: string }>) {
  return { findAll: jest.fn(async () => employees) };
}

describe('ReportsService — UC-006 acceptance criteria', () => {
  beforeEach(() => {
    (isFutureMonth as jest.Mock).mockReturnValue(false);
    (countBusinessDays as jest.Mock).mockReturnValue(3);
    (lateMinutesAfterNine as jest.Mock).mockReturnValue(0);
  });

  // AC-1: 5 distinct check-in dates -> work_days = 5.
  it('AC-1: counts work_days as the number of distinct check-in dates', async () => {
    const dates = ['2025-03-03', '2025-03-04', '2025-03-05', '2025-03-06', '2025-03-07'];
    const attendanceRows = dates.map((date) => ({ employeeId: 2, date, checkInAt: new Date() }));
    const repository = makeRepository({ findAttendanceInRange: jest.fn(async () => attendanceRows) });
    const employeesRepository = makeEmployeesRepository([LAN]);
    const service = new ReportsService(repository as any, employeesRepository as any);

    const [row] = await service.monthlyReport(2025, 3);

    expect(row.workDays).toBe(5);
  });

  // AC-2: one approved annual request, 3 (mocked) business days -> leave_days = 3.
  it('AC-2: sums leave_days from approved requests', async () => {
    const leaveRows = [{ employeeId: 2, fromDate: '2025-03-10', toDate: '2025-03-12' }];
    const repository = makeRepository({ findApprovedLeaveOverlapping: jest.fn(async () => leaveRows) });
    const employeesRepository = makeEmployeesRepository([LAN]);
    const service = new ReportsService(repository as any, employeesRepository as any);

    const [row] = await service.monthlyReport(2025, 3);

    expect(row.leaveDays).toBe(3);
  });

  // AC-3: two late check-ins (15 + 5 min) -> late_minutes = 20, work_days = 2.
  it('AC-3: sums late_minutes across the month', async () => {
    (lateMinutesAfterNine as jest.Mock).mockReturnValueOnce(15).mockReturnValueOnce(5);
    const attendanceRows = [
      { employeeId: 2, date: '2025-03-03', checkInAt: new Date('2025-03-03T02:15:00Z') },
      { employeeId: 2, date: '2025-03-04', checkInAt: new Date('2025-03-04T02:05:00Z') },
    ];
    const repository = makeRepository({ findAttendanceInRange: jest.fn(async () => attendanceRows) });
    const employeesRepository = makeEmployeesRepository([LAN]);
    const service = new ReportsService(repository as any, employeesRepository as any);

    const [row] = await service.monthlyReport(2025, 3);

    expect(row.lateMinutes).toBe(20);
    expect(row.workDays).toBe(2);
  });

  // AC-4: month out of 1-12 range -> rejected before touching the repository.
  it('AC-4: rejects an invalid month', async () => {
    const repository = makeRepository();
    const employeesRepository = makeEmployeesRepository([LAN]);
    const service = new ReportsService(repository as any, employeesRepository as any);

    await expect(service.monthlyReport(2025, 13)).rejects.toThrow(
      new BadRequestException('Tháng không hợp lệ'),
    );
    expect(repository.findAttendanceInRange).not.toHaveBeenCalled();
  });

  // AC-5: month is in the future relative to "today" -> rejected.
  it('AC-5: rejects a future month', async () => {
    (isFutureMonth as jest.Mock).mockReturnValue(true);
    const repository = makeRepository();
    const employeesRepository = makeEmployeesRepository([LAN]);
    const service = new ReportsService(repository as any, employeesRepository as any);

    await expect(service.monthlyReport(2026, 9)).rejects.toThrow(
      new BadRequestException('Không thể xuất báo cáo cho tháng trong tương lai'),
    );
  });

  // AC-6: employee with no attendance/leave rows still appears, all zeros.
  it('AC-6: reports all zeros for an employee with no activity in the month', async () => {
    const repository = makeRepository();
    const employeesRepository = makeEmployeesRepository([LAN, HUNG]);
    const service = new ReportsService(repository as any, employeesRepository as any);

    const rows = await service.monthlyReport(2025, 3);

    expect(rows).toEqual([
      { employeeId: 2, fullName: 'Trần Thị Lan', department: 'Engineering', workDays: 0, leaveDays: 0, lateMinutes: 0 },
      { employeeId: 3, fullName: 'Lê Văn Hùng', department: 'Engineering', workDays: 0, leaveDays: 0, lateMinutes: 0 },
    ]);
  });
});
