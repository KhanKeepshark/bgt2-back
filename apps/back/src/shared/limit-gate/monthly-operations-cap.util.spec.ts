import { getMonthlyOperationsCapCreatedAtRange } from './monthly-operations-cap.util';

describe('getMonthlyOperationsCapCreatedAtRange', () => {
  it('returns June 2024 bounds in Asia/Almaty as UTC instants', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    const { start, end } = getMonthlyOperationsCapCreatedAtRange(now);

    expect(start.toISOString()).toBe('2024-05-31T19:00:00.000Z');
    expect(end.toISOString()).toBe('2024-06-30T18:59:59.999Z');
  });

  it('rolls to next month after Almaty midnight on the 1st', () => {
    const now = new Date('2024-05-31T19:00:00.000Z');
    const { start, end } = getMonthlyOperationsCapCreatedAtRange(now);

    expect(start.toISOString()).toBe('2024-05-31T19:00:00.000Z');
    expect(end.toISOString()).toBe('2024-06-30T18:59:59.999Z');
  });
});
