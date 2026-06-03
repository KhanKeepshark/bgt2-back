import {
  buildDailyCountSeries,
  getUserOperationsDailyRange,
  USER_STATS_DAILY_DAYS,
} from './user-operations-daily.util';

describe('getUserOperationsDailyRange', () => {
  it('returns 30 Almaty date keys ending on the given day', () => {
    const { dateKeys } = getUserOperationsDailyRange(
      new Date('2026-06-03T12:00:00.000Z'),
    );

    expect(dateKeys).toHaveLength(USER_STATS_DAILY_DAYS);
    expect(dateKeys.at(-1)).toBe('2026-06-03');
    expect(dateKeys[0]).toBe('2026-05-05');
  });

  it('start is midnight Almaty on the first day as UTC', () => {
    const { start } = getUserOperationsDailyRange(
      new Date('2026-06-03T12:00:00.000Z'),
    );

    expect(start.toISOString()).toBe('2026-05-04T19:00:00.000Z');
  });
});

describe('buildDailyCountSeries', () => {
  it('fills missing days with zero', () => {
    const series = buildDailyCountSeries(
      ['2026-06-01', '2026-06-02', '2026-06-03'],
      new Map([['2026-06-02', 5]]),
    );

    expect(series).toEqual([
      { date: '2026-06-01', count: 0 },
      { date: '2026-06-02', count: 5 },
      { date: '2026-06-03', count: 0 },
    ]);
  });
});
