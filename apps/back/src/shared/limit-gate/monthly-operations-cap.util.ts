/** CONTEXT.md Monthly operations cap — calendar month in Asia/Almaty. */
export const LIMIT_GATE_TIMEZONE = 'Asia/Almaty';

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

/** Last calendar day for a 1-indexed month. */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
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

/** Inclusive UTC range for Operation.createdAt matching the current cap month. */
export function getMonthlyOperationsCapCreatedAtRange(now = new Date()): {
  start: Date;
  end: Date;
} {
  const { year, month } = getZonedYearMonth(now, LIMIT_GATE_TIMEZONE);
  const lastDay = getLastDayOfMonth(year, month);

  return {
    start: almatyLocalToUtc(year, month, 1, 0, 0, 0, 0),
    end: almatyLocalToUtc(year, month, lastDay, 23, 59, 59, 999),
  };
}
