const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Today's calendar date in Vietnam, as 'YYYY-MM-DD' — independent of the
 * host server's timezone, so E1 (UC-004) behaves the same wherever the API
 * is deployed.
 */
export function todayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIMEZONE }).format(new Date());
}

/**
 * Count of Mon-Fri days between fromDate and toDate, both inclusive.
 * Business day per specs/entities/entity-model.md#leaverequest — weekends
 * excluded, national holidays NOT excluded in MVP (deliberate, do not add).
 */
export function countBusinessDays(fromDate: string, toDate: string): number {
  const start = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  let count = 0;
  for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
    const day = d.getUTCDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
