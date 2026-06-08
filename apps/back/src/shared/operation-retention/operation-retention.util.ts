import { BadRequestException } from '@nestjs/common';
import { OperationError } from '../constants/errors.constants';
import { LIMIT_GATE_TIMEZONE } from '../limit-gate/monthly-operations-cap.util';

const ALMATY_UTC_OFFSET_HOURS = 5;

type ZonedParts = {
  year: number;
  month: number;
};

function getZonedYearMonth(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
  };
}

function addMonths(year: number, month: number, delta: number): ZonedParts {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  };
}

/** Local wall-clock in Asia/Almaty (+05:00, no DST) → UTC Date. */
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

/** UTC instant for 00:00 on the 1st of a calendar month in Asia/Almaty. */
export function yearMonthFromAlmatyParts(year: number, month: number): Date {
  return almatyLocalToUtc(year, month, 1, 0, 0, 0, 0);
}

/** First day of the hot window: current Almaty month minus 24 months. */
export function getHotWindowStartMonth(now = new Date()): Date {
  const { year, month } = getZonedYearMonth(now, LIMIT_GATE_TIMEZONE);
  const target = addMonths(year, month, -24);
  return almatyLocalToUtc(target.year, target.month, 1, 0, 0, 0, 0);
}

/** Month archived on the 1st cron run of the current Almaty month. */
export function getArchiveTargetMonth(now = new Date()): Date {
  const { year, month } = getZonedYearMonth(now, LIMIT_GATE_TIMEZONE);
  const target = addMonths(year, month, -25);
  return almatyLocalToUtc(target.year, target.month, 1, 0, 0, 0, 0);
}

/** Inclusive start, exclusive end for Operation.date filters in a calendar month. */
export function getMonthBoundsInUtc(yearMonth: Date): { start: Date; end: Date } {
  const { year, month } = getZonedYearMonth(yearMonth, LIMIT_GATE_TIMEZONE);
  const next = addMonths(year, month, 1);
  return {
    start: almatyLocalToUtc(year, month, 1, 0, 0, 0, 0),
    end: almatyLocalToUtc(next.year, next.month, 1, 0, 0, 0, 0),
  };
}

export function isOperationDateInHotWindow(
  date: Date,
  now = new Date(),
): boolean {
  return date >= getHotWindowStartMonth(now);
}

export function assertOperationDateInHotWindow(
  date: Date,
  now = new Date(),
): void {
  if (!isOperationDateInHotWindow(date, now)) {
    throw new BadRequestException(OperationError.DATE_BEFORE_RETENTION_CUTOFF);
  }
}
