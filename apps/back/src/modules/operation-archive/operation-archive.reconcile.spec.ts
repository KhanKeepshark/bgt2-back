import { reconcileArchiveMonth } from './operation-archive.reconcile';

describe('reconcileArchiveMonth', () => {
  it('returns ok when rollup totals match raw', () => {
    expect(
      reconcileArchiveMonth(
        {
          incomeTotal: 100,
          expenseTotal: 50,
          incomeCount: 2,
          expenseCount: 1,
        },
        {
          incomeTotal: 100,
          expenseTotal: 50,
          incomeCount: 2,
          expenseCount: 1,
        },
      ).ok,
    ).toBe(true);
  });

  it('returns mismatch details', () => {
    const result = reconcileArchiveMonth(
      {
        incomeTotal: 100,
        expenseTotal: 50,
        incomeCount: 2,
        expenseCount: 1,
      },
      {
        incomeTotal: 99,
        expenseTotal: 50,
        incomeCount: 2,
        expenseCount: 1,
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.diff.some((d) => d.includes('incomeTotal'))).toBe(true);
    }
  });
});
