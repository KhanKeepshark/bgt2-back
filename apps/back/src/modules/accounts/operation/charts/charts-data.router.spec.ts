import {
  listArchivedYearMonths,
  resolveChartsRangeMode,
} from './charts-data.router';
import { getHotWindowStartMonth } from '../../../../shared/operation-retention/operation-retention.util';

describe('charts-data.router', () => {
  const now = new Date('2026-06-05T12:00:00.000Z');
  const hotStart = getHotWindowStartMonth(now);

  it('returns archived when dateTo < hotStart', () => {
    expect(
      resolveChartsRangeMode(
        new Date('2023-01-01'),
        new Date('2024-01-01'),
        hotStart,
      ),
    ).toBe('archived');
  });

  it('returns hot when dateFrom >= hotStart', () => {
    expect(
      resolveChartsRangeMode(hotStart, new Date('2026-06-01'), hotStart),
    ).toBe('hot');
  });

  it('returns spanning otherwise', () => {
    expect(
      resolveChartsRangeMode(
        new Date('2024-01-01'),
        new Date('2026-06-01'),
        hotStart,
      ),
    ).toBe('spanning');
  });

  it('lists archived months intersecting range', () => {
    const months = listArchivedYearMonths(
      new Date('2024-04-15'),
      new Date('2024-05-15'),
      hotStart,
    );
    expect(months).toHaveLength(2);
  });
});
