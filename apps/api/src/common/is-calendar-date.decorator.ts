import { registerDecorator, type ValidationOptions } from 'class-validator';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// `@Matches(/^\d{4}-\d{2}-\d{2}$/)` only checks the string shape — it lets
// "2026-13-45" or "2026-02-30" through, which later reach Postgres as a
// raw `date` column value and crash with an uncaught 22008 "datetime
// field overflow" instead of a clean validation error (same failure mode
// UC-006's year param had). This round-trips the parsed value through
// Date.UTC so a month/day that doesn't exist on the calendar is rejected
// here instead of at the database.
export function IsCalendarDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCalendarDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const match = DATE_PATTERN.exec(value);
          if (!match) return false;
          const year = Number(match[1]);
          const month = Number(match[2]);
          const day = Number(match[3]);
          const date = new Date(Date.UTC(year, month - 1, day));
          return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
          );
        },
      },
    });
  };
}
