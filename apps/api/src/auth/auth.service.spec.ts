import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { AuthService } from './auth.service.js';

function makeEmployeesRepository(
  byEmail: Record<string, any>,
  byId: Record<number, any> = {},
  all: any[] = [],
) {
  return {
    findByEmail: jest.fn(async (email: string) => byEmail[email.toLowerCase()]),
    findById: jest.fn(async (id: number) => byId[id]),
    findAll: jest.fn(async () => all),
  };
}

const LAN = {
  id: 2,
  fullName: 'Trần Thị Lan',
  email: 'lan.tran@company.com',
  department: 'Engineering',
  managerId: 1,
  annualLeaveBalance: 8,
};

describe('AuthService — UC-001 acceptance criteria', () => {
  // AC-1: known email -> session issued, employee returned.
  it('AC-1: logs in successfully for a registered email', async () => {
    const repo = makeEmployeesRepository({ 'lan.tran@company.com': LAN }, {}, [LAN]);
    const service = new AuthService(repo as any);

    const result = await service.login('lan.tran@company.com');

    expect(result.employee).toEqual(
      expect.objectContaining({ id: 2, fullName: 'Trần Thị Lan', email: LAN.email }),
    );
    expect(typeof result.token).toBe('string');
    expect(result.token.split('.')).toHaveLength(2);
  });

  // AC-2: unknown email -> E1, no session.
  it('AC-2: rejects an email that matches no Employee', async () => {
    const repo = makeEmployeesRepository({});
    const service = new AuthService(repo as any);

    await expect(service.login('khong-ton-tai@company.com')).rejects.toThrow(
      new UnauthorizedException('Tài khoản này chưa được cấp quyền truy cập hệ thống'),
    );
  });

  it('me() returns the employee for a valid session employeeId', async () => {
    const repo = makeEmployeesRepository({}, { 2: LAN }, [LAN]);
    const service = new AuthService(repo as any);

    const result = await service.me(2);

    expect(result).toEqual(expect.objectContaining({ id: 2, fullName: 'Trần Thị Lan' }));
  });

  // Role clarity (2026-08-09 fix): session response tells the frontend who
  // it's logged in as, computed from the same manager_id relationship
  // UC-005 already authorizes against.
  it('marks an employee with no direct reports as role "employee"', async () => {
    const repo = makeEmployeesRepository({}, { 2: LAN }, [LAN]);
    const service = new AuthService(repo as any);

    const result = await service.me(2);

    expect(result.role).toBe('employee');
  });

  it('marks an employee referenced as someone else\'s manager as role "manager"', async () => {
    const minh = { id: 1, fullName: 'Nguyễn Văn Minh', email: 'minh.nguyen@company.com', department: 'Engineering', managerId: null, annualLeaveBalance: 10 };
    const repo = makeEmployeesRepository({}, { 1: minh }, [minh, LAN]);
    const service = new AuthService(repo as any);

    const result = await service.me(1);

    expect(result.role).toBe('manager');
  });

  it('marks the configured HR_DIRECTOR_EMAIL as role "hr_director"', async () => {
    const ha = { id: 10, fullName: 'Phạm Thị Hà', email: 'ha.pham@company.com', department: 'HR', managerId: null, annualLeaveBalance: 12 };
    const repo = makeEmployeesRepository({}, { 10: ha }, [ha]);
    const service = new AuthService(repo as any);

    const result = await service.me(10);

    expect(result.role).toBe('hr_director');
  });
});
