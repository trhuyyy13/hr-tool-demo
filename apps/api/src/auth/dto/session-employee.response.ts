import type { EmployeeRole } from '../../employees/role.util.js';

export type SessionEmployeeResponse = {
  id: number;
  fullName: string;
  email: string;
  department: string;
  annualLeaveBalance: number;
  role: EmployeeRole;
};
