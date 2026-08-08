import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';

// Isolate from real calendar/clock math, same approach as leave-requests.service.spec.ts.
jest.unstable_mockModule('../common/date.util.js', () => ({
  todayDateString: jest.fn(() => '2025-03-15'),
  formatTimeVN: jest.fn((d: Date) => (d.getUTCHours() === 1 ? '08:55' : '17:05')),
}));

const { AttendanceService } = await import('./attendance.service.js');

function makeRepository(overrides: Partial<Record<'checkIn' | 'checkOut' | 'findToday', any>> = {}) {
  return {
    findToday: jest.fn(async () => undefined),
    checkIn: jest.fn(async () => ({ kind: 'created', row: {} })),
    checkOut: jest.fn(async () => ({ kind: 'updated', row: {} })),
    ...overrides,
  };
}

describe('AttendanceService — UC-002 acceptance criteria', () => {
  // AC-1: no record today -> check-in creates one.
  it('AC-1: check-in creates a new record on first check-in of the day', async () => {
    const row = {
      date: '2025-03-15',
      checkInAt: new Date('2025-03-15T01:55:00Z'),
      checkOutAt: null,
    };
    const repository = makeRepository({ checkIn: jest.fn(async () => ({ kind: 'created', row })) });
    const service = new AttendanceService(repository as any);

    const result = await service.checkIn(2);

    expect(result.checkInAt).toBe(row.checkInAt.toISOString());
    expect(result.checkOutAt).toBeNull();
  });

  // AC-2: already checked in today -> rejected, exact message with the existing time.
  it('AC-2: rejects a second check-in the same day', async () => {
    const row = { checkInAt: new Date('2025-03-15T01:55:00Z') };
    const repository = makeRepository({
      checkIn: jest.fn(async () => ({ kind: 'already-checked-in', row })),
    });
    const service = new AttendanceService(repository as any);

    await expect(service.checkIn(2)).rejects.toThrow(
      new BadRequestException('Bạn đã chấm công vào lúc 08:55 hôm nay'),
    );
  });

  // AC-3: already checked in, not checked out -> check-out updates checkOutAt.
  it('AC-3: check-out succeeds after a check-in', async () => {
    const row = {
      date: '2025-03-15',
      checkInAt: new Date('2025-03-15T01:55:00Z'),
      checkOutAt: new Date('2025-03-15T10:05:00Z'),
    };
    const repository = makeRepository({ checkOut: jest.fn(async () => ({ kind: 'updated', row })) });
    const service = new AttendanceService(repository as any);

    const result = await service.checkOut(2);

    expect(result.checkOutAt).toBe(row.checkOutAt.toISOString());
  });

  // AC-4: no check-in today -> check-out rejected.
  it('AC-4: rejects check-out with no check-in today', async () => {
    const repository = makeRepository({ checkOut: jest.fn(async () => ({ kind: 'not-checked-in' })) });
    const service = new AttendanceService(repository as any);

    await expect(service.checkOut(2)).rejects.toThrow(
      new BadRequestException('Bạn chưa chấm công vào, không thể chấm công ra'),
    );
  });

  // AC-5: already checked out today -> rejected, exact message with the existing time.
  it('AC-5: rejects a second check-out the same day', async () => {
    const row = { checkOutAt: new Date('2025-03-15T10:05:00Z') };
    const repository = makeRepository({
      checkOut: jest.fn(async () => ({ kind: 'already-checked-out', row })),
    });
    const service = new AttendanceService(repository as any);

    await expect(service.checkOut(2)).rejects.toThrow(
      new BadRequestException('Bạn đã chấm công ra lúc 17:05 hôm nay'),
    );
  });

  // AC-6: no record today -> both timestamps null.
  it('AC-6: reports null check-in/check-out when nothing recorded today', async () => {
    const repository = makeRepository({ findToday: jest.fn(async () => undefined) });
    const service = new AttendanceService(repository as any);

    const result = await service.today(2);

    expect(result).toEqual({ date: '2025-03-15', checkInAt: null, checkOutAt: null });
  });
});
