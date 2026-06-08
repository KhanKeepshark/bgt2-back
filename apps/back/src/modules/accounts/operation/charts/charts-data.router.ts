import type { ChartsRangeMode } from './charts-data.types';
import {
  getMonthBoundsInUtc,
  yearMonthFromAlmatyParts,
} from '@back/shared/operation-retention/operation-retention.util';

const ALMATY_TZ = 'Asia/Almaty';

function getZonedYearMonthDay(date: Date): {
  year: number;
  month: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ALMATY_TZ,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
  };
}

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function yearMonthToKey(yearMonth: Date): string {
  const { year, month } = getZonedYearMonthDay(yearMonth);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function resolveChartsRangeMode(
  dateFrom: Date | undefined,
  dateTo: Date | undefined,
  hotStart: Date,
): ChartsRangeMode {
  if (!dateFrom && !dateTo) {
    return 'all-time';
  }
  const from = dateFrom ?? new Date(0);
  const to = dateTo ?? new Date();
  if (to < hotStart) {
    return 'archived';
  }
  if (from >= hotStart) {
    return 'hot';
  }
  return 'spanning';
}

/** Whole calendar months in [dateFrom, dateTo] that are before hotStart. */
export function listArchivedYearMonths(
  dateFrom: Date,
  dateTo: Date,
  hotStart: Date,
): Date[] {
  const months: Date[] = [];
  const start = getZonedYearMonthDay(dateFrom);
  let { year, month } = start;
  const end = getZonedYearMonthDay(dateTo);

  while (true) {
    const monthStart = yearMonthFromAlmatyParts(year, month);
    if (monthStart >= hotStart) {
      break;
    }

    const { end: monthEndExclusive } = getMonthBoundsInUtc(monthStart);
    const monthEnd = new Date(monthEndExclusive.getTime() - 1);
    if (monthStart <= dateTo && monthEnd >= dateFrom) {
      months.push(monthStart);
    }

    if (year === end.year && month === end.month) {
      break;
    }

    const next = addMonths(year, month, 1);
    year = next.year;
    month = next.month;
  }

  return months;
}

export function normalizeChartsDates(
  dateFrom?: Date,
  dateTo?: Date,
): { dateFrom?: Date; dateTo?: Date } {
  if (!dateFrom && !dateTo) {
    return {};
  }
  return {
    dateFrom: dateFrom ?? new Date(0),
    dateTo: dateTo ?? new Date(),
  };
}
