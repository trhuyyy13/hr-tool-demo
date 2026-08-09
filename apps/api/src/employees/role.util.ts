import { HR_DIRECTOR_EMAIL } from '../common/hr-director.js';

export type EmployeeRole = 'hr_director' | 'manager' | 'employee';

// Computed, not stored — Employee has no `role` column (UC-006's known gap).
// "Manager" here means "has at least one direct report", derived from the
// same manager_id relationship UC-005 already uses for authorization; it's
// not a separate permission grant, so it can't drift out of sync with who
// can actually approve what.
export function computeRole(
  employee: { id: number; email: string },
  allEmployees: Array<{ managerId: number | null }>,
): EmployeeRole {
  if (employee.email.toLowerCase() === HR_DIRECTOR_EMAIL.toLowerCase()) {
    return 'hr_director';
  }
  const isManager = allEmployees.some((e) => e.managerId === employee.id);
  return isManager ? 'manager' : 'employee';
}
