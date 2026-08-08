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

/** 'HH:mm' in Vietnam time — used in UC-002's E1/E3 rejection messages. */
export function formatTimeVN(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** 'YYYY-MM-01'..last day of that month, both inclusive — UC-006's report window. */
export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/** UC-006 E2 — reports can't be run for a month later than the current one. */
export function isFutureMonth(year: number, month: number): boolean {
  const [todayYear, todayMonth] = todayDateString().split('-').map(Number);
  return year > todayYear! || (year === todayYear && month > todayMonth!);
}

/**
 * Minutes a Vietnam-local check-in falls after 09:00 — UC-006's late_minutes
 * business rule (demo cutoff, not configurable per employee/department yet).
 */
export function lateMinutesAfterNine(checkInAt: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(checkInAt);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const lateMinutes = hour * 60 + minute - 9 * 60;
  return lateMinutes > 0 ? lateMinutes : 0;
}
