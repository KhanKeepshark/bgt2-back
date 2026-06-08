import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { OperationType, User } from '@prisma/generated';
import { Prisma } from '@prisma/generated';
import { OperationChartsFilterInput } from '../inputs/operation-charts-filter';
import { calculateGroupSize, groupDays } from '../utils/findAllForCharts.utils';
import { Categories } from '../models/operation-chart-data.model';
import { CategoryModel } from '../../category/models/category.model';
import { OperationError } from '@back/shared/constants/errors.constants';
import { getHotWindowStartMonth } from '@back/shared/operation-retention/operation-retention.util';
import { ChartSlice } from './charts-data.types';
import {
  listArchivedYearMonths,
  normalizeChartsDates,
  resolveChartsRangeMode,
  yearMonthToKey,
} from './charts-data.router';

@Injectable()
export class ChartsDataService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAllForCharts(user: User, filter?: OperationChartsFilterInput) {
    try {
      const hotStart = getHotWindowStartMonth();
      const normalized = normalizeChartsDates(filter?.dateFrom, filter?.dateTo);
      const mode = resolveChartsRangeMode(
        normalized.dateFrom,
        normalized.dateTo,
        hotStart,
      );

      let slice: ChartSlice;
      if (mode === 'all-time') {
        const archived = await this.fetchArchivedSlice(user.id, {
          yearMonths: undefined,
          hotStart,
          filter,
        });
        const hot = await this.fetchHotSlice(user, {
          dateFrom: hotStart,
          dateTo: new Date(),
          filter,
        });
        slice = this.mergeSlices(archived, hot);
      } else if (mode === 'archived') {
        slice = await this.fetchArchivedSlice(user.id, {
          yearMonths: listArchivedYearMonths(
            normalized.dateFrom!,
            normalized.dateTo!,
            hotStart,
          ),
          hotStart,
          filter,
        });
      } else if (mode === 'hot') {
        slice = await this.fetchHotSlice(user, {
          dateFrom: normalized.dateFrom!,
          dateTo: normalized.dateTo!,
          filter,
        });
      } else {
        const archived = await this.fetchArchivedSlice(user.id, {
          yearMonths: listArchivedYearMonths(
            normalized.dateFrom!,
            new Date(hotStart.getTime() - 1),
            hotStart,
          ),
          hotStart,
          filter,
        });
        const hot = await this.fetchHotSlice(user, {
          dateFrom: hotStart,
          dateTo: normalized.dateTo!,
          filter,
        });
        slice = this.mergeSlices(archived, hot);
      }

      return this.buildChartResponse(user, filter, slice, normalized);
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.NOT_FOUND);
      }
      throw error;
    }
  }

  private mergeSlices(a: ChartSlice, b: ChartSlice): ChartSlice {
    const mergeDays = (
      target: Record<string, number>,
      source: Record<string, number>,
    ) => {
      for (const [day, value] of Object.entries(source)) {
        target[day] = (target[day] ?? 0) + value;
      }
    };

    const incomeByDays = { ...a.incomeByDays };
    const expenseByDays = { ...a.expenseByDays };
    mergeDays(incomeByDays, b.incomeByDays);
    mergeDays(expenseByDays, b.expenseByDays);

    const categoryMap = new Map<string, { type: OperationType; total: number }>();
    for (const row of [...a.categoryTotals, ...b.categoryTotals]) {
      const key = `${row.categoryId}:${row.type}`;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += row.total;
      } else {
        categoryMap.set(key, { type: row.type, total: row.total });
      }
    }

    return {
      incomeByDays,
      expenseByDays,
      incomeAll: a.incomeAll + b.incomeAll,
      expenseAll: a.expenseAll + b.expenseAll,
      categoryTotals: Array.from(categoryMap.entries()).map(
        ([key, value]) => ({
          categoryId: key.split(':')[0],
          type: value.type,
          total: value.total,
        }),
      ),
    };
  }

  private async fetchArchivedSlice(
    userId: string,
    options: {
      yearMonths: Date[] | undefined;
      hotStart: Date;
      filter?: OperationChartsFilterInput;
    },
  ): Promise<ChartSlice> {
    const where: Prisma.OperationMonthlyRollupWhereInput = {
      userId,
      yearMonth: { lt: options.hotStart },
    };

    if (options.yearMonths) {
      if (options.yearMonths.length === 0) {
        return {
          incomeByDays: {},
          expenseByDays: {},
          incomeAll: 0,
          expenseAll: 0,
          categoryTotals: [],
        };
      }
      where.yearMonth = { in: options.yearMonths };
    }

    if (options.filter?.categoryIds?.length) {
      where.categoryId = { in: options.filter.categoryIds };
    }
    if (options.filter?.accountIds?.length) {
      where.accountId = { in: options.filter.accountIds };
    }

    const rows = await this.prisma.operationMonthlyRollup.findMany({ where });

    const incomeByDays: Record<string, number> = {};
    const expenseByDays: Record<string, number> = {};
    let incomeAll = 0;
    let expenseAll = 0;
    const categoryAcc = new Map<string, { type: OperationType; total: number }>();

    for (const row of rows) {
      const amount = Number(row.totalAmount);
      const monthKey = yearMonthToKey(row.yearMonth);
      const catKey = `${row.categoryId ?? 'none'}:${row.type}`;

      if (row.type === OperationType.INCOME) {
        incomeByDays[monthKey] = (incomeByDays[monthKey] ?? 0) + amount;
        incomeAll += amount;
      } else {
        expenseByDays[monthKey] = (expenseByDays[monthKey] ?? 0) + amount;
        expenseAll += amount;
      }

      const existing = categoryAcc.get(catKey);
      if (existing) {
        existing.total += amount;
      } else {
        categoryAcc.set(catKey, { type: row.type, total: amount });
      }
    }

    return {
      incomeByDays,
      expenseByDays,
      incomeAll,
      expenseAll,
      categoryTotals: Array.from(categoryAcc.entries()).map(([key, v]) => ({
        categoryId: key.split(':')[0],
        type: v.type,
        total: v.total,
      })),
    };
  }

  private async fetchHotSlice(
    user: User,
    options: {
      dateFrom: Date;
      dateTo: Date;
      filter?: OperationChartsFilterInput;
    },
  ): Promise<ChartSlice> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"userId" = ${user.id}`,
      Prisma.sql`"type" != 'TRANSFER'`,
      Prisma.sql`"date" >= ${options.dateFrom}::timestamp`,
      Prisma.sql`"date" <= ${options.dateTo}::timestamp`,
    ];

    const filter = options.filter;
    if (filter?.categoryIds?.length) {
      const catIds = Prisma.join(filter.categoryIds.map((id) => Prisma.sql`${id}`));
      conditions.push(Prisma.sql`"categoryId" IN (${catIds})`);
    }
    if (filter?.searchDescription) {
      conditions.push(
        Prisma.sql`"description" ILIKE ${'%' + filter.searchDescription + '%'}`,
      );
    }
    if (filter?.accountIds?.length) {
      const accIds = Prisma.join(filter.accountIds.map((id) => Prisma.sql`${id}`));
      conditions.push(
        Prisma.sql`("accountId" IN (${accIds}) OR "transferAccountId" IN (${accIds}))`,
      );
    }

    const whereClause = Prisma.sql`${Prisma.join(conditions, ' AND ')}`;

    const byDaysResult = await this.prisma.$queryRaw<
      Array<{ day: string; type: OperationType; total: Prisma.Decimal }>
    >`
      SELECT
        TO_CHAR(("date" AT TIME ZONE 'Asia/Almaty'), 'YYYY-MM-DD') as day,
        "type",
        SUM("amount") as total
      FROM "Operation"
      WHERE ${whereClause}
      GROUP BY TO_CHAR(("date" AT TIME ZONE 'Asia/Almaty'), 'YYYY-MM-DD'), "type"
      ORDER BY day ASC
    `;

    const byCategoriesResult = await this.prisma.$queryRaw<
      Array<{ categoryId: string; type: OperationType; total: Prisma.Decimal }>
    >`
      SELECT "categoryId", "type", SUM("amount") as total
      FROM "Operation"
      WHERE ${whereClause} AND "categoryId" IS NOT NULL
      GROUP BY "categoryId", "type"
    `;

    const incomeByDays: Record<string, number> = {};
    const expenseByDays: Record<string, number> = {};
    let incomeAll = 0;
    let expenseAll = 0;

    for (const row of byDaysResult) {
      const amount = Number(row.total);
      if (row.type === OperationType.INCOME) {
        incomeByDays[row.day] = amount;
        incomeAll += amount;
      } else {
        expenseByDays[row.day] = amount;
        expenseAll += amount;
      }
    }

    return {
      incomeByDays,
      expenseByDays,
      incomeAll,
      expenseAll,
      categoryTotals: byCategoriesResult.map((row) => ({
        categoryId: row.categoryId,
        type: row.type,
        total: Number(row.total),
      })),
    };
  }

  private async buildChartResponse(
    user: User,
    filter: OperationChartsFilterInput | undefined,
    slice: ChartSlice,
    normalized: { dateFrom?: Date; dateTo?: Date },
  ) {
    let dateFrom = normalized.dateFrom ?? new Date();
    let dateTo = normalized.dateTo ?? new Date();

    const allDayKeys = [
      ...Object.keys(slice.incomeByDays),
      ...Object.keys(slice.expenseByDays),
    ].sort();
    if (!normalized.dateFrom && allDayKeys.length > 0) {
      dateFrom = new Date(allDayKeys[0]);
    }
    if (!normalized.dateTo && allDayKeys.length > 0) {
      dateTo = new Date(allDayKeys[allDayKeys.length - 1]);
    }

    const diffTime = dateTo.getTime() - dateFrom.getTime();
    const diffDays = Math.max(
      1,
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1,
    );

    const isArchivedOnly =
      resolveChartsRangeMode(normalized.dateFrom, normalized.dateTo, getHotWindowStartMonth()) ===
      'archived';

    const incomeDays = Object.keys(slice.incomeByDays).length;
    const expenseDays = Object.keys(slice.expenseByDays).length;
    const incomeGroupSize = isArchivedOnly ? 1 : calculateGroupSize(incomeDays);
    const expenseGroupSize = isArchivedOnly ? 1 : calculateGroupSize(expenseDays);

    const incomeByDays = isArchivedOnly
      ? Object.entries(slice.incomeByDays).map(([key, value]) => ({
          key,
          value: value.toString(),
        }))
      : groupDays(slice.incomeByDays, incomeGroupSize);
    const expenseByDays = isArchivedOnly
      ? Object.entries(slice.expenseByDays).map(([key, value]) => ({
          key,
          value: value.toString(),
        }))
      : groupDays(slice.expenseByDays, expenseGroupSize);

    let previousIncomeAll = 0;
    let previousExpenseAll = 0;
    const previousIncomeByCategories = new Map<string, number>();
    const previousExpenseByCategories = new Map<string, number>();

    if (filter?.type && filter.type !== 'custom') {
      const previous = await this.fetchPreviousPeriodTotals(user, filter, {
        dateFrom,
        dateTo,
        diffDays,
      });
      previousIncomeAll = previous.incomeAll;
      previousExpenseAll = previous.expenseAll;
      previous.incomeByCategory.forEach((v, k) =>
        previousIncomeByCategories.set(k, v),
      );
      previous.expenseByCategory.forEach((v, k) =>
        previousExpenseByCategories.set(k, v),
      );
    }

    const calculateChangePercent = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? '100' : current < 0 ? '-100' : '0';
      }
      return (((current - previous) / previous) * 100).toFixed(2);
    };

    const incomeChangePercent =
      filter?.type && filter.type !== 'custom'
        ? calculateChangePercent(slice.incomeAll, previousIncomeAll)
        : undefined;
    const expenseChangePercent =
      filter?.type && filter.type !== 'custom'
        ? calculateChangePercent(slice.expenseAll, previousExpenseAll)
        : undefined;

    const calculateAverages = (total: number, days: number) => {
      const dayAverage = days > 0 ? (total / days).toFixed(2) : '0';
      if (days < 15) return { dayAverage };
      const weekAverage = days > 0 ? (total / (days / 7)).toFixed(2) : '0';
      if (days < 61) return { dayAverage, weekAverage };
      const monthAverage = days > 0 ? (total / (days / 30)).toFixed(2) : '0';
      if (days < 731) return { dayAverage, weekAverage, monthAverage };
      const yearAverage = days > 0 ? (total / (days / 365)).toFixed(2) : '0';
      return { dayAverage, weekAverage, monthAverage, yearAverage };
    };

    const categoryIds = new Set(
      slice.categoryTotals
        .map((r) => r.categoryId)
        .filter((id) => id !== 'none'),
    );
    const categories = await this.prisma.category.findMany({
      where: { id: { in: Array.from(categoryIds) } },
      include: { keywords: true, children: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const rollupMeta = await this.loadRollupCategoryMeta(user.id, slice);

    const buildCategoryList = (type: OperationType): Categories[] => {
      const rows = slice.categoryTotals.filter((r) => r.type === type);
      const all = type === OperationType.INCOME ? slice.incomeAll : slice.expenseAll;
      const prevMap =
        type === OperationType.INCOME
          ? previousIncomeByCategories
          : previousExpenseByCategories;

      const categories: Categories[] = [];

      for (const row of rows) {
        const category =
          row.categoryId !== 'none'
            ? categoryMap.get(row.categoryId) ??
              rollupMeta.get(row.categoryId)
            : undefined;
        if (!category) continue;

        const amount = row.total;
        const percent = all > 0 ? ((amount / all) * 100).toFixed(2) : '0';
        const prevAmount =
          filter?.type && filter.type !== 'custom'
            ? prevMap.get(category.id) || 0
            : 0;
        const changePercent =
          filter?.type && filter.type !== 'custom'
            ? calculateChangePercent(amount, prevAmount)
            : undefined;

        categories.push({
          category: category as unknown as CategoryModel,
          all: new Decimal(amount),
          percent,
          changePercent,
        });
      }

      return categories.sort((a, b) => b.all.toNumber() - a.all.toNumber());
    };

    return {
      income: {
        all: new Decimal(slice.incomeAll),
        byDays: incomeByDays,
        averages: calculateAverages(slice.incomeAll, diffDays),
        categories: buildCategoryList(OperationType.INCOME),
        groupSize: incomeGroupSize,
        changePercent: incomeChangePercent,
      },
      expense: {
        all: new Decimal(slice.expenseAll),
        byDays: expenseByDays,
        averages: calculateAverages(slice.expenseAll, diffDays),
        categories: buildCategoryList(OperationType.EXPENSE),
        groupSize: expenseGroupSize,
        changePercent: expenseChangePercent,
      },
    };
  }

  private async loadRollupCategoryMeta(userId: string, slice: ChartSlice) {
    const ids = slice.categoryTotals
      .map((r) => r.categoryId)
      .filter((id) => id && id !== 'none') as string[];

    if (ids.length === 0) return new Map<string, CategoryModel>();

    const rows = await this.prisma.operationMonthlyRollup.findMany({
      where: { userId, categoryId: { in: ids } },
      select: { categoryId: true, categoryName: true, categoryIcon: true },
      distinct: ['categoryId'],
    });

    return new Map(
      rows
        .filter((r) => r.categoryId)
        .map((r) => [
          r.categoryId!,
          {
            id: r.categoryId!,
            name: r.categoryName ?? 'Unknown',
            icon: r.categoryIcon ?? 'default',
          } as CategoryModel,
        ]),
    );
  }

  private async fetchPreviousPeriodTotals(
    user: User,
    filter: OperationChartsFilterInput,
    ctx: { dateFrom: Date; dateTo: Date; diffDays: number },
  ) {
    let previousDateFrom: Date;
    let previousDateTo: Date;
    const { dateFrom, dateTo, diffDays } = ctx;

    if (filter.type === 'week') {
      previousDateTo = new Date(dateFrom);
      previousDateTo.setDate(previousDateTo.getDate() - 1);
      previousDateFrom = new Date(previousDateTo);
      previousDateFrom.setDate(previousDateFrom.getDate() - 6);
    } else if (filter.type === 'month') {
      previousDateTo = new Date(dateTo);
      previousDateTo.setMonth(previousDateTo.getMonth() - 1);
      previousDateFrom = new Date(dateFrom);
      previousDateFrom.setMonth(previousDateFrom.getMonth() - 1);
    } else if (filter.type === 'year') {
      previousDateTo = new Date(dateTo);
      previousDateTo.setFullYear(previousDateTo.getFullYear() - 1);
      previousDateFrom = new Date(dateFrom);
      previousDateFrom.setFullYear(previousDateFrom.getFullYear() - 1);
    } else {
      previousDateTo = new Date(dateFrom);
      previousDateTo.setDate(previousDateTo.getDate() - 1);
      previousDateFrom = new Date(previousDateTo);
      previousDateFrom.setDate(previousDateFrom.getDate() - diffDays + 1);
    }

    const hotStart = getHotWindowStartMonth();
    const mode = resolveChartsRangeMode(previousDateFrom, previousDateTo, hotStart);
    const normalized = { dateFrom: previousDateFrom, dateTo: previousDateTo };

    let slice: ChartSlice;
    if (mode === 'archived') {
      slice = await this.fetchArchivedSlice(user.id, {
        yearMonths: listArchivedYearMonths(
          previousDateFrom,
          previousDateTo,
          hotStart,
        ),
        hotStart,
        filter,
      });
    } else if (mode === 'hot') {
      slice = await this.fetchHotSlice(user, {
        dateFrom: previousDateFrom,
        dateTo: previousDateTo,
        filter,
      });
    } else if (mode === 'spanning') {
      const archived = await this.fetchArchivedSlice(user.id, {
        yearMonths: listArchivedYearMonths(
          previousDateFrom,
          new Date(hotStart.getTime() - 1),
          hotStart,
        ),
        hotStart,
        filter,
      });
      const hot = await this.fetchHotSlice(user, {
        dateFrom: hotStart,
        dateTo: previousDateTo,
        filter,
      });
      slice = this.mergeSlices(archived, hot);
    } else {
      slice = await this.fetchHotSlice(user, {
        dateFrom: previousDateFrom,
        dateTo: previousDateTo,
        filter,
      });
    }

    const incomeByCategory = new Map<string, number>();
    const expenseByCategory = new Map<string, number>();
    for (const row of slice.categoryTotals) {
      if (row.categoryId === 'none') continue;
      if (row.type === OperationType.INCOME) {
        incomeByCategory.set(row.categoryId, row.total);
      } else {
        expenseByCategory.set(row.categoryId, row.total);
      }
    }

    return {
      incomeAll: slice.incomeAll,
      expenseAll: slice.expenseAll,
      incomeByCategory,
      expenseByCategory,
    };
  }
}
