import type { EmployeeRole } from '../role.util.js';

export type EmployeeResponse = {
  id: number;
  fullName: string;
  email: string;
  department: string;
  managerId: number | null;
  annualLeaveBalance: number;
  role: EmployeeRole;
};
