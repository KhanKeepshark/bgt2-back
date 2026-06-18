import { LIMIT_GATE_TIMEZONE } from '@back/shared/limit-gate/monthly-operations-cap.util';

/** 00:01 Asia/Almaty (UTC+5, no DST) — same instant every day in UTC. */
export const RECURRENCE_CRON_UTC = '1 19 * * *';

const ALMATY_UTC_OFFSET_HOURS = 5;

export type AlmatyDateParts = {
  year: number;
  month: number;
  day: number;
};

function getZonedDateParts(date: Date, timeZone: string): AlmatyDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function almatyLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date {
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour - ALMATY_UTC_OFFSET_HOURS,
      minute,
      second,
      millisecond,
    ),
  );
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getAlmatyDateParts(date: Date): AlmatyDateParts {
  return getZonedDateParts(date, LIMIT_GATE_TIMEZONE);
}

export function getAlmatyDayBounds(now = new Date()): { start: Date; end: Date } {
  const { year, month, day } = getAlmatyDateParts(now);

  return {
    start: almatyLocalToUtc(year, month, day, 0, 0, 0, 0),
    end: almatyLocalToUtc(year, month, day, 23, 59, 59, 999),
  };
}

export function almatyPartsToUtcStart(parts: AlmatyDateParts): Date {
  return almatyLocalToUtc(parts.year, parts.month, parts.day, 0, 0, 0, 0);
}

export function addAlmatyDays(
  parts: AlmatyDateParts,
  daysToAdd: number,
): AlmatyDateParts {
  const anchor = almatyLocalToUtc(parts.year, parts.month, parts.day, 12, 0, 0, 0);
  anchor.setUTCDate(anchor.getUTCDate() + daysToAdd);
  return getAlmatyDateParts(anchor);
}

export function addAlmatyMonths(
  parts: AlmatyDateParts,
  monthsToAdd: number,
): AlmatyDateParts {
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1 + monthsToAdd, parts.day),
  );

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function addAlmatyYears(
  parts: AlmatyDateParts,
  yearsToAdd: number,
): AlmatyDateParts {
  const lastDay = getLastDayOfMonth(parts.year + yearsToAdd, parts.month);

  return {
    year: parts.year + yearsToAdd,
    month: parts.month,
    day: Math.min(parts.day, lastDay),
  };
}

export function getAlmatyDayOfWeek(date: Date): number {
  const { year, month, day } = getAlmatyDateParts(date);
  const noon = almatyLocalToUtc(year, month, day, 12, 0, 0, 0);
  return noon.getUTCDay();
}

export function compareAlmatyCalendarDays(a: Date, b: Date): number {
  const left = getAlmatyDateParts(a);
  const right = getAlmatyDateParts(b);

  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

export function isAlmatyCalendarDayOnOrBefore(
  date: Date,
  now = new Date(),
): boolean {
  return compareAlmatyCalendarDays(date, now) <= 0;
}
