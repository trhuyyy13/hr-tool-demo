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

  // Role clarity (2026-08-09): computed from manager_id, not a stored column.
  it('assigns role manager/employee/hr_director based on the org relationship', async () => {
    const minh = { id: 1, fullName: 'Nguyễn Văn Minh', email: 'minh.nguyen@company.com', department: 'Engineering', managerId: null, annualLeaveBalance: 10 };
    const ha = { id: 10, fullName: 'Phạm Thị Hà', email: 'ha.pham@company.com', department: 'HR', managerId: null, annualLeaveBalance: 12 };
    const lan = { id: 2, fullName: 'Trần Thị Lan', email: 'lan.tran@company.com', department: 'Engineering', managerId: 1, annualLeaveBalance: 8 };
    const repository = { findAll: jest.fn(async () => [minh, ha, lan]) };
    const service = new EmployeesService(repository as any);

    const rows = await service.listAll();

    expect(rows.find((r) => r.id === 1)!.role).toBe('manager');
    expect(rows.find((r) => r.id === 10)!.role).toBe('hr_director');
    expect(rows.find((r) => r.id === 2)!.role).toBe('employee');
  });
});
