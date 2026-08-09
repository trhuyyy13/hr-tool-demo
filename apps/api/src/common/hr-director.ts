// UC-005 E5 — demo stand-in for a real "HR Director" role (no `role` column
// on Employee yet, same gap UC-006 already lives with). Shared by
// LeaveRequestsService (who approves when an employee has no manager) and
// role.util (how that person shows up in the UI).
export const HR_DIRECTOR_EMAIL = process.env.HR_DIRECTOR_EMAIL ?? 'ha.pham@company.com';
