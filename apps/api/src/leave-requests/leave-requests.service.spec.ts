import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';

// Isolate the service from real calendar math — each test sets its own
// "today" and business-day count so assertions don't depend on when the
// suite happens to run.
jest.unstable_mockModule('../common/date.util.js', () => ({
  todayDateString: jest.fn(() => '2025-03-15'),
  countBusinessDays: jest.fn(() => 3),
}));

const { LeaveRequestsService } = await import('./leave-requests.service.js');
const { todayDateString, countBusinessDays } = await import('../common/date.util.js');

type MockedEmployee = {
  id: number;
  fullName: string;
  email: string;
  managerId: number | null;
  annualLeaveBalance: number;
};

function makeRepository(overlapResult: { kind: 'overlap' } | { kind: 'created'; row: any }) {
  return { createIfNoOverlap: jest.fn(async () => overlapResult) };
}

function makeEmployeesRepository(employeesById: Record<number, MockedEmployee>) {
  return { findById: jest.fn(async (id: number) => employeesById[id]) };
}

function makeMailService() {
  return { sendLeaveApprovalRequest: jest.fn(async () => undefined) };
}

const EMPLOYEE = (over: Partial<MockedEmployee> = {}): MockedEmployee => ({
  id: 2,
  fullName: 'Trần Thị Lan',
  email: 'lan.tran@company.com',
  managerId: 1,
  annualLeaveBalance: 8,
  ...over,
});

const MANAGER: MockedEmployee = {
  id: 1,
  fullName: 'Nguyễn Văn Minh',
  email: 'minh.nguyen@company.com',
  managerId: null,
  annualLeaveBalance: 10,
};

describe('LeaveRequestsService — UC-004 acceptance criteria', () => {
  beforeEach(() => {
    (todayDateString as jest.Mock).mockReturnValue('2025-03-15');
    (countBusinessDays as jest.Mock).mockReturnValue(3);
  });

  // AC-1: 8 days balance, no pending request, annual leave 2025-03-20..03-22
  // (3 business days) -> created pending, manager notified, balance untouched.
  it('AC-1: creates a pending request and emails the manager, without touching the balance', async () => {
    const createdRow = {
      id: 100,
      employeeId: 2,
      type: 'annual',
      fromDate: '2025-03-20',
      toDate: '2025-03-22',
      reason: 'Nghỉ lễ gia đình',
      status: 'pending',
    };
    const repository = makeRepository({ kind: 'created', row: createdRow });
    const employeesRepository = makeEmployeesRepository({ 2: EMPLOYEE(), 1: MANAGER });
    const mailService = makeMailService();
    const service = new LeaveRequestsService(
      repository as any,
      employeesRepository as any,
      mailService as any,
    );

    const result = await service.create(2, {
      type: 'annual',
      fromDate: '2025-03-20',
      toDate: '2025-03-22',
      reason: 'Nghỉ lễ gia đình',
    });

    expect(result.status).toBe('pending');
    expect(repository.createIfNoOverlap).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 2, type: 'annual' }),
    );
    expect(mailService.sendLeaveApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({ to: MANAGER.email, leaveRequestId: 100 }),
    );
  });

  // AC-2: today=2025-03-15, fromDate=2025-03-10 (past) -> rejected, no record.
  it('AC-2: rejects a past fromDate and never reaches the repository', async () => {
    const repository = makeRepository({ kind: 'created', row: {} });
    const employeesRepository = makeEmployeesRepository({ 2: EMPLOYEE() });
    const service = new LeaveRequestsService(
      repository as any,
      employeesRepository as any,
      makeMailService() as any,
    );

    await expect(
      service.create(2, { type: 'annual', fromDate: '2025-03-10', toDate: '2025-03-12', reason: 'x' }),
    ).rejects.toThrow(new BadRequestException('Không thể xin nghỉ ngày quá khứ'));
    expect(repository.createIfNoOverlap).not.toHaveBeenCalled();
  });

  // AC-3: 2 days balance, request needs 3 (mocked) business days of annual leave -> rejected.
  it('AC-3: rejects annual leave exceeding the remaining balance', async () => {
    const repository = makeRepository({ kind: 'created', row: {} });
    const employeesRepository = makeEmployeesRepository({ 2: EMPLOYEE({ annualLeaveBalance: 2 }) });
    const service = new LeaveRequestsService(
      repository as any,
      employeesRepository as any,
      makeMailService() as any,
    );

    await expect(
      service.create(2, { type: 'annual', fromDate: '2025-03-20', toDate: '2025-03-24', reason: 'x' }),
    ).rejects.toThrow(new BadRequestException('Số ngày phép còn lại: 2'));
    expect(repository.createIfNoOverlap).not.toHaveBeenCalled();
  });

  // AC-4: repository reports an overlapping pending/approved request -> rejected.
  it('AC-4: rejects a request overlapping an existing pending/approved one', async () => {
    const repository = makeRepository({ kind: 'overlap' });
    const employeesRepository = makeEmployeesRepository({ 2: EMPLOYEE() });
    const service = new LeaveRequestsService(
      repository as any,
      employeesRepository as any,
      makeMailService() as any,
    );

    await expect(
      service.create(2, { type: 'annual', fromDate: '2025-03-21', toDate: '2025-03-23', reason: 'x' }),
    ).rejects.toThrow(new BadRequestException('Đã có yêu cầu nghỉ chồng lấn thời gian'));
  });

  // AC-5: 0 days balance, SICK leave for 3 (mocked) business days -> created; sick bypasses the balance check.
  it('AC-5: allows sick leave to exceed the annual balance', async () => {
    const createdRow = {
      id: 101,
      employeeId: 2,
      type: 'sick',
      fromDate: '2025-03-20',
      toDate: '2025-03-22',
      reason: 'Ốm',
      status: 'pending',
    };
    const repository = makeRepository({ kind: 'created', row: createdRow });
    const employeesRepository = makeEmployeesRepository({
      2: EMPLOYEE({ annualLeaveBalance: 0 }),
      1: MANAGER,
    });
    const service = new LeaveRequestsService(
      repository as any,
      employeesRepository as any,
      makeMailService() as any,
    );

    const result = await service.create(2, {
      type: 'sick',
      fromDate: '2025-03-20',
      toDate: '2025-03-22',
      reason: 'Ốm',
    });

    expect(result.status).toBe('pending');
    expect(repository.createIfNoOverlap).toHaveBeenCalled();
  });
});
