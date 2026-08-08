import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

function makeDecideRepository(overrides: {
  findById?: any;
  decide?: any;
} = {}) {
  return {
    findById: jest.fn(async () => undefined),
    decide: jest.fn(async () => ({ kind: 'decided', row: {} })),
    ...overrides,
  };
}

function makeEmployeesRepository(employeesById: Record<number, MockedEmployee>) {
  return {
    findById: jest.fn(async (id: number) => employeesById[id]),
    findByEmail: jest.fn(async (email: string) =>
      Object.values(employeesById).find((e) => e.email.toLowerCase() === email.toLowerCase()),
    ),
  };
}

// UC-005 E5 — default HR_DIRECTOR_EMAIL fallback used when an employee has no manager.
const HR_DIRECTOR: MockedEmployee = {
  id: 10,
  fullName: 'Phạm Thị Hà',
  email: 'ha.pham@company.com',
  managerId: null,
  annualLeaveBalance: 12,
};

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

  // E5: employee has no manager (org's top) -> HR Director gets the email instead.
  it('E5: notifies the HR Director when the employee has no manager', async () => {
    const createdRow = {
      id: 102,
      employeeId: 1,
      type: 'annual',
      fromDate: '2025-03-20',
      toDate: '2025-03-22',
      reason: 'Nghỉ phép',
      status: 'pending',
    };
    const repository = makeRepository({ kind: 'created', row: createdRow });
    const employeesRepository = makeEmployeesRepository({
      1: EMPLOYEE({ id: 1, managerId: null, fullName: 'Nguyễn Văn Minh' }),
      10: HR_DIRECTOR,
    });
    const mailService = makeMailService();
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, mailService as any);

    await service.create(1, { type: 'annual', fromDate: '2025-03-20', toDate: '2025-03-22', reason: 'Nghỉ phép' });

    expect(mailService.sendLeaveApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({ to: HR_DIRECTOR.email }),
    );
  });
});

const PENDING_ANNUAL = {
  id: 200,
  employeeId: 2,
  type: 'annual',
  fromDate: '2025-03-20',
  toDate: '2025-03-22',
  reason: 'Nghỉ lễ',
  status: 'pending',
};

const PENDING_SICK = { ...PENDING_ANNUAL, id: 201, type: 'sick' };

describe('LeaveRequestsService — UC-005 acceptance criteria', () => {
  beforeEach(() => {
    (countBusinessDays as jest.Mock).mockReturnValue(3);
  });

  // AC-1: annual, manager matches, balance sufficient -> approved + ApprovalLog (repository's job).
  it('AC-1: approves an annual request as the direct manager', async () => {
    const decidedRow = { ...PENDING_ANNUAL, status: 'approved' };
    const repository = makeDecideRepository({
      findById: jest.fn(async () => PENDING_ANNUAL),
      decide: jest.fn(async () => ({ kind: 'decided', row: decidedRow })),
    });
    const employeesRepository = makeEmployeesRepository({ 1: MANAGER, 2: EMPLOYEE({ managerId: 1 }) });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    const result = await service.approve(1, 200);

    expect(result.status).toBe('approved');
    expect(repository.decide).toHaveBeenCalledWith(
      expect.objectContaining({ leaveRequestId: 200, managerId: 1, decision: 'approved', businessDays: 3 }),
    );
  });

  // AC-2: sick leave -> businessDays passed as 0, balance untouched by this layer (repository's concern).
  it('AC-2: approves a sick request without counting business days', async () => {
    const decidedRow = { ...PENDING_SICK, status: 'approved' };
    const repository = makeDecideRepository({
      findById: jest.fn(async () => PENDING_SICK),
      decide: jest.fn(async () => ({ kind: 'decided', row: decidedRow })),
    });
    const employeesRepository = makeEmployeesRepository({ 1: MANAGER, 2: EMPLOYEE({ managerId: 1 }) });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    await service.approve(1, 201);

    expect(repository.decide).toHaveBeenCalledWith(expect.objectContaining({ businessDays: 0 }));
  });

  // AC-3: reject with a reason -> passed through to the repository.
  it('AC-3: rejects with a reason', async () => {
    const decidedRow = { ...PENDING_ANNUAL, status: 'rejected', rejectReason: 'Trùng lịch dự án' };
    const repository = makeDecideRepository({
      findById: jest.fn(async () => PENDING_ANNUAL),
      decide: jest.fn(async () => ({ kind: 'decided', row: decidedRow })),
    });
    const employeesRepository = makeEmployeesRepository({ 1: MANAGER, 2: EMPLOYEE({ managerId: 1 }) });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    const result = await service.reject(1, 200, { reason: 'Trùng lịch dự án' });

    expect(result.status).toBe('rejected');
    expect(repository.decide).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'rejected', rejectReason: 'Trùng lịch dự án' }),
    );
  });

  // AC-4: reject without a reason -> rejected before the repository is ever touched.
  it('AC-4: rejects the reject when no reason is given', async () => {
    const repository = makeDecideRepository({ findById: jest.fn(async () => PENDING_ANNUAL) });
    const employeesRepository = makeEmployeesRepository({ 1: MANAGER, 2: EMPLOYEE({ managerId: 1 }) });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    await expect(service.reject(1, 200, { reason: '  ' })).rejects.toThrow(
      new BadRequestException('Cần nhập lý do từ chối'),
    );
    expect(repository.decide).not.toHaveBeenCalled();
  });

  // AC-5: caller is not the requester's direct manager -> forbidden.
  it('AC-5: forbids approval from someone who is not the direct manager', async () => {
    const repository = makeDecideRepository({ findById: jest.fn(async () => PENDING_ANNUAL) });
    const employeesRepository = makeEmployeesRepository({ 1: MANAGER, 2: EMPLOYEE({ managerId: 1 }) });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    await expect(service.approve(99, 200)).rejects.toThrow(
      new ForbiddenException('Bạn không có quyền duyệt yêu cầu này'),
    );
    expect(repository.decide).not.toHaveBeenCalled();
  });

  // AC-6: request no longer pending -> repository reports 'not-pending'.
  it('AC-6: rejects deciding a request that is no longer pending', async () => {
    const repository = makeDecideRepository({
      findById: jest.fn(async () => PENDING_ANNUAL),
      decide: jest.fn(async () => ({ kind: 'not-pending' })),
    });
    const employeesRepository = makeEmployeesRepository({ 1: MANAGER, 2: EMPLOYEE({ managerId: 1 }) });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    await expect(service.approve(1, 200)).rejects.toThrow(
      new BadRequestException('Yêu cầu không tồn tại hoặc đã được xử lý'),
    );
  });

  // AC-7: balance dropped below what's needed since the request was submitted.
  it('AC-7: rejects approval when the balance is no longer sufficient', async () => {
    const repository = makeDecideRepository({
      findById: jest.fn(async () => PENDING_ANNUAL),
      decide: jest.fn(async () => ({ kind: 'insufficient-balance', balance: 2 })),
    });
    const employeesRepository = makeEmployeesRepository({ 1: MANAGER, 2: EMPLOYEE({ managerId: 1 }) });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    await expect(service.approve(1, 200)).rejects.toThrow(
      new BadRequestException('Số ngày phép còn lại: 2'),
    );
  });

  // AC-8: employee has no manager -> the HR Director fallback can approve.
  it('AC-8: HR Director approves when the employee has no manager', async () => {
    const pendingNoManager = { ...PENDING_ANNUAL, employeeId: 1 };
    const decidedRow = { ...pendingNoManager, status: 'approved' };
    const repository = makeDecideRepository({
      findById: jest.fn(async () => pendingNoManager),
      decide: jest.fn(async () => ({ kind: 'decided', row: decidedRow })),
    });
    const employeesRepository = makeEmployeesRepository({
      1: EMPLOYEE({ id: 1, managerId: null, fullName: 'Nguyễn Văn Minh' }),
      10: HR_DIRECTOR,
    });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    const result = await service.approve(HR_DIRECTOR.id, 200);

    expect(result.status).toBe('approved');
    expect(repository.decide).toHaveBeenCalledWith(
      expect.objectContaining({ managerId: HR_DIRECTOR.id, decision: 'approved' }),
    );
  });

  // E5 negative: employee has no manager, but the caller isn't the HR Director either.
  it('E5: forbids approval from someone who is neither the manager nor the HR Director', async () => {
    const pendingNoManager = { ...PENDING_ANNUAL, employeeId: 1 };
    const repository = makeDecideRepository({ findById: jest.fn(async () => pendingNoManager) });
    const employeesRepository = makeEmployeesRepository({
      1: EMPLOYEE({ id: 1, managerId: null, fullName: 'Nguyễn Văn Minh' }),
      10: HR_DIRECTOR,
    });
    const service = new LeaveRequestsService(repository as any, employeesRepository as any, makeMailService() as any);

    await expect(service.approve(99, 200)).rejects.toThrow(
      new ForbiddenException('Bạn không có quyền duyệt yêu cầu này'),
    );
    expect(repository.decide).not.toHaveBeenCalled();
  });
});
