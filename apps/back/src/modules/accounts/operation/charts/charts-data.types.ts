import { OperationType } from '@prisma/generated';

export type ChartsRangeMode = 'hot' | 'archived' | 'spanning' | 'all-time';

export type ChartSlice = {
  incomeByDays: Record<string, number>;
  expenseByDays: Record<string, number>;
  incomeAll: number;
  expenseAll: number;
  categoryTotals: Array<{
    categoryId: string;
    type: OperationType;
    total: number;
  }>;
};
