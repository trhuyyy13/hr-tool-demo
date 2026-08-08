import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { AuthService } from './auth.service.js';

function makeEmployeesRepository(byEmail: Record<string, any>, byId: Record<number, any> = {}) {
  return {
    findByEmail: jest.fn(async (email: string) => byEmail[email.toLowerCase()]),
    findById: jest.fn(async (id: number) => byId[id]),
  };
}

const LAN = {
  id: 2,
  fullName: 'Trần Thị Lan',
  email: 'lan.tran@company.com',
  department: 'Engineering',
  annualLeaveBalance: 8,
};

describe('AuthService — UC-001 acceptance criteria', () => {
  // AC-1: known email -> session issued, employee returned.
  it('AC-1: logs in successfully for a registered email', async () => {
    const repo = makeEmployeesRepository({ 'lan.tran@company.com': LAN });
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
    const repo = makeEmployeesRepository({}, { 2: LAN });
    const service = new AuthService(repo as any);

    const result = await service.me(2);

    expect(result).toEqual(expect.objectContaining({ id: 2, fullName: 'Trần Thị Lan' }));
  });
});
