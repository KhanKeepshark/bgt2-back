import {
  getArchiveTargetMonth,
  getHotWindowStartMonth,
  getMonthBoundsInUtc,
  isOperationDateInHotWindow,
} from './operation-retention.util';

describe('operation-retention.util', () => {
  const now = new Date('2026-06-05T12:00:00.000Z');

  it('hotStart is 1st of month 24 months before current (June 2024)', () => {
    expect(getHotWindowStartMonth(now).toISOString()).toBe(
      '2024-05-31T19:00:00.000Z',
    );
  });

  it('archiveTarget is 1st of month 25 months before current (May 2024)', () => {
    expect(getArchiveTargetMonth(now).toISOString()).toBe(
      '2024-04-30T19:00:00.000Z',
    );
  });

  it('month bounds for May 2024 Almaty', () => {
    const may2024 = new Date('2024-04-30T19:00:00.000Z');
    const { start, end } = getMonthBoundsInUtc(may2024);
    expect(start.toISOString()).toBe('2024-04-30T19:00:00.000Z');
    expect(end.toISOString()).toBe('2024-05-31T19:00:00.000Z');
  });

  it('rejects operation date in archived month', () => {
    const archivedDate = new Date('2024-05-15T12:00:00.000Z');
    expect(isOperationDateInHotWindow(archivedDate, now)).toBe(false);
  });

  it('allows operation date in hot month', () => {
    const hotDate = new Date('2024-06-15T12:00:00.000Z');
    expect(isOperationDateInHotWindow(hotDate, now)).toBe(true);
  });
});
