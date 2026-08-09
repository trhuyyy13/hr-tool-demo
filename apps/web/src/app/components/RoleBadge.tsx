export type EmployeeRole = 'hr_director' | 'manager' | 'employee';

const ROLE_LABEL: Record<EmployeeRole, string> = {
  hr_director: 'HR Director',
  manager: 'Quản lý',
  employee: 'Nhân viên',
};

// Computed server-side from manager_id (see apps/api/src/employees/role.util.ts)
// — shown everywhere identity shows up so testers know who can approve what
// without guessing from a name.
export function RoleBadge({ role }: { role: EmployeeRole }) {
  return <span className={`badge badge-${role}`}>{ROLE_LABEL[role]}</span>;
}
