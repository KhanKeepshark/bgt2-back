/** CONTEXT.md Monthly operations cap — calendar day in Asia/Almaty. */
const LIMIT_GATE_TIMEZONE = 'Asia/Almaty';

export const USER_STATS_DAILY_DAYS = 30;

const ALMATY_UTC_OFFSET_HOURS = 5;

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
};

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
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

function addDaysToZonedDate(
  parts: ZonedDateParts,
  daysToAdd: number,
): ZonedDateParts {
  const utc = almatyLocalToUtc(
    parts.year,
    parts.month,
    parts.day,
    12,
    0,
    0,
    0,
  );
  utc.setUTCDate(utc.getUTCDate() + daysToAdd);
  return getZonedDateParts(utc, LIMIT_GATE_TIMEZONE);
}

function formatAlmatyDateKey(parts: ZonedDateParts): string {
  const month = `${parts.month}`.padStart(2, '0');
  const day = `${parts.day}`.padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

/** UTC range covering the last N Almaty calendar days (inclusive of today). */
export function getUserOperationsDailyRange(
  now = new Date(),
  days = USER_STATS_DAILY_DAYS,
): { start: Date; dateKeys: string[] } {
  const today = getZonedDateParts(now, LIMIT_GATE_TIMEZONE);
  const firstDay = addDaysToZonedDate(today, -(days - 1));

  const dateKeys: string[] = [];
  let cursor = firstDay;

  for (let i = 0; i < days; i++) {
    dateKeys.push(formatAlmatyDateKey(cursor));
    cursor = addDaysToZonedDate(cursor, 1);
  }

  return {
    start: almatyLocalToUtc(
      firstDay.year,
      firstDay.month,
      firstDay.day,
      0,
      0,
      0,
      0,
    ),
    dateKeys,
  };
}

export function buildDailyCountSeries(
  dateKeys: string[],
  countsByDate: Map<string, number>,
): { date: string; count: number }[] {
  return dateKeys.map((dateKey) => ({
    date: dateKey,
    count: countsByDate.get(dateKey) ?? 0,
  }));
}
