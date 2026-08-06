export type EmployeeResponse = {
  id: number;
  fullName: string;
  department: string;
  managerId: number | null;
  annualLeaveBalance: number;
};
