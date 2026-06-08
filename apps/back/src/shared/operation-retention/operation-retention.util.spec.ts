import {
  getArchiveTargetMonth,
  getHotWindowStartMonth,
  getMaxOperationDate,
  getMonthBoundsInUtc,
  isOperationDateInHotWindow,
  isOperationDateWithinFutureLimit,
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

  it('max date is end of same day +12 months in Almaty', () => {
    expect(getMaxOperationDate(now).toISOString()).toBe(
      '2027-06-05T18:59:59.999Z',
    );
  });

  it('rejects operation date more than 12 months ahead', () => {
    const tooFar = new Date('2027-06-06T12:00:00.000Z');
    expect(isOperationDateWithinFutureLimit(tooFar, now)).toBe(false);
  });

  it('allows operation date within 12 months ahead', () => {
    const allowed = new Date('2027-05-15T12:00:00.000Z');
    expect(isOperationDateWithinFutureLimit(allowed, now)).toBe(true);
  });
});
