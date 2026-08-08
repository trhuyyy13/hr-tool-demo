import type { LeaveRequestResponse } from './leave-request.response.js';

export type PendingLeaveRequestResponse = LeaveRequestResponse & {
  employeeName: string;
};
