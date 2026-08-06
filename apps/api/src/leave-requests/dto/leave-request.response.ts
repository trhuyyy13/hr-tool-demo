export type LeaveRequestResponse = {
  id: number;
  employeeId: number;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
};
