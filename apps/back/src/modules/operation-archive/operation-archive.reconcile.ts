export type ArchiveTotals = {
  incomeTotal: number;
  expenseTotal: number;
  incomeCount: number;
  expenseCount: number;
};

export type ReconcileResult = { ok: true } | { ok: false; diff: string[] };

export function reconcileArchiveMonth(
  rollup: ArchiveTotals,
  raw: ArchiveTotals,
): ReconcileResult {
  const diff: string[] = [];

  if (rollup.incomeTotal !== raw.incomeTotal) {
    diff.push(
      `incomeTotal rollup=${rollup.incomeTotal} raw=${raw.incomeTotal}`,
    );
  }
  if (rollup.expenseTotal !== raw.expenseTotal) {
    diff.push(
      `expenseTotal rollup=${rollup.expenseTotal} raw=${raw.expenseTotal}`,
    );
  }
  if (rollup.incomeCount !== raw.incomeCount) {
    diff.push(
      `incomeCount rollup=${rollup.incomeCount} raw=${raw.incomeCount}`,
    );
  }
  if (rollup.expenseCount !== raw.expenseCount) {
    diff.push(
      `expenseCount rollup=${rollup.expenseCount} raw=${raw.expenseCount}`,
    );
  }

  return diff.length === 0 ? { ok: true } : { ok: false, diff };
}
