import {
  addAlmatyDays,
  addAlmatyMonths,
  almatyPartsToUtcStart,
  compareAlmatyCalendarDays,
  getAlmatyDateParts,
  getAlmatyDayBounds,
  getAlmatyDayOfWeek,
  isAlmatyCalendarDayOnOrBefore,
} from './almaty-calendar.util';

describe('almaty-calendar.util', () => {
  it('getAlmatyDayBounds for midday UTC on June 5 2026 Almaty', () => {
    const now = new Date('2026-06-05T12:00:00.000Z');
    const { start, end } = getAlmatyDayBounds(now);

    expect(start.toISOString()).toBe('2026-06-04T19:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-05T18:59:59.999Z');
  });

  it('rolls day bounds after Almaty midnight', () => {
    const now = new Date('2026-06-05T19:30:00.000Z');
    const { start, end } = getAlmatyDayBounds(now);

    expect(start.toISOString()).toBe('2026-06-05T19:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-06T18:59:59.999Z');
  });

  it('compareAlmatyCalendarDays treats start/end of same Almaty day as equal', () => {
    const startOfDay = new Date('2026-06-04T19:00:00.000Z');
    const endOfDay = new Date('2026-06-05T18:59:59.999Z');
    const now = new Date('2026-06-05T12:00:00.000Z');

    expect(compareAlmatyCalendarDays(startOfDay, endOfDay)).toBe(0);
    expect(isAlmatyCalendarDayOnOrBefore(startOfDay, now)).toBe(true);
    expect(isAlmatyCalendarDayOnOrBefore(endOfDay, now)).toBe(true);
  });

  it('addAlmatyDays advances calendar in Asia/Almaty', () => {
    const parts = getAlmatyDateParts(new Date('2026-06-05T12:00:00.000Z'));
    const next = almatyPartsToUtcStart(addAlmatyDays(parts, 1));

    expect(next.toISOString()).toBe('2026-06-05T19:00:00.000Z');
  });

  it('addAlmatyMonths handles month overflow like JS Date', () => {
    const parts = getAlmatyDateParts(new Date('2026-01-31T12:00:00.000Z'));
    const next = almatyPartsToUtcStart(addAlmatyMonths(parts, 1));

    expect(getAlmatyDateParts(next)).toEqual({ year: 2026, month: 3, day: 3 });
  });

  it('getAlmatyDayOfWeek matches Almaty calendar weekday', () => {
    const thursday = new Date('2026-06-03T19:00:00.000Z');
    expect(getAlmatyDayOfWeek(thursday)).toBe(4);
  });
});
