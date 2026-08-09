import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLeaveRequestDto } from './create-leave-request.dto.js';

function make(overrides: Partial<Record<'type' | 'fromDate' | 'toDate' | 'reason', unknown>> = {}) {
  return plainToInstance(CreateLeaveRequestDto, {
    type: 'annual',
    fromDate: '2026-08-20',
    toDate: '2026-08-21',
    reason: 'Nghỉ phép',
    ...overrides,
  });
}

describe('CreateLeaveRequestDto — calendar date validation', () => {
  it('accepts well-formed calendar dates', async () => {
    const errors = await validate(make());
    expect(errors).toHaveLength(0);
  });

  it('accepts a real leap-year Feb 29', async () => {
    const errors = await validate(make({ fromDate: '2028-02-29', toDate: '2028-03-01' }));
    expect(errors).toHaveLength(0);
  });

  // Regression: "2026-13-45" matched the old shape-only regex
  // (\d{4}-\d{2}-\d{2}) and reached Postgres as a raw date value, which
  // crashed with an uncaught 22008 error instead of a validation message.
  it('rejects a month that does not exist (2026-13-45)', async () => {
    const errors = await validate(make({ fromDate: '2026-13-45' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual(
      expect.objectContaining({ isCalendarDate: 'fromDate phải theo định dạng YYYY-MM-DD' }),
    );
  });

  // Regression: Feb 30 doesn't exist but silently rolled over to March 2
  // under plain `new Date(...)` parsing used elsewhere in the codebase —
  // reject it outright instead of normalizing it to a different date.
  it('rejects a day that does not exist in that month (2026-02-30)', async () => {
    const errors = await validate(make({ toDate: '2026-02-30', fromDate: '2026-02-01' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('toDate');
  });

  it('rejects a non-date-shaped string', async () => {
    const errors = await validate(make({ fromDate: 'not-a-date' }));
    expect(errors).toHaveLength(1);
  });
});
