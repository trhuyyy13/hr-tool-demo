import { jest } from '@jest/globals';
import { EmployeesService } from './employees.service.js';

// Regression (Ngày 05 UI review, 2026-08-08): listAll() used to omit `email`,
// so the login picker's "Đăng nhập bằng Google" button called
// handleLogin(undefined) for every employee — POST /auth/login silently
// dropped the field and every login failed with "email must be an email".
// Never caught by curl/unit tests because those always hardcoded a real
// email instead of reading it off this endpoint's response.
describe('EmployeesService', () => {
  it('includes email in every employee row (login picker depends on it)', async () => {
    const repository = {
      findAll: jest.fn(async () => [
        {
          id: 2,
          fullName: 'Trần Thị Lan',
          email: 'lan.tran@company.com',
          department: 'Engineering',
          managerId: 1,
          annualLeaveBalance: 8,
        },
      ]),
    };
    const service = new EmployeesService(repository as any);

    const [employee] = await service.listAll();

    expect(employee.email).toBe('lan.tran@company.com');
  });
});
