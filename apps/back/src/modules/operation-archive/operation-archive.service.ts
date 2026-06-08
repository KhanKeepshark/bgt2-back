import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  NotificationScope,
  OperationType,
  Prisma,
} from '@prisma/generated';
import {
  getArchiveTargetMonth,
  getHotWindowStartMonth,
  getMonthBoundsInUtc,
  yearMonthFromAlmatyParts,
} from '@back/shared/operation-retention/operation-retention.util';
import { reconcileArchiveMonth } from './operation-archive.reconcile';

type ArchiveAggRow = {
  categoryId: string | null;
  accountId: string | null;
  type: OperationType;
  total: Prisma.Decimal;
  count: number;
};

@Injectable()
export class OperationArchiveService {
  private readonly logger = new Logger(OperationArchiveService.name);

  public constructor(private readonly prisma: PrismaService) {}

  public async archiveMonthForUser(
    userId: string,
    yearMonth: Date,
    options: { deleteEnabled: boolean },
  ): Promise<'skipped' | 'archived'> {
    const existing = await this.prisma.operationMonthlyRollup.count({
      where: { userId, yearMonth },
    });
    if (existing > 0) {
      return 'skipped';
    }

    const { start, end } = getMonthBoundsInUtc(yearMonth);
    const rows = await this.prisma.$queryRaw<ArchiveAggRow[]>`
      SELECT o."categoryId", o."accountId", o."type",
             SUM(o."amount")::decimal AS total,
             COUNT(*)::int AS count
      FROM "Operation" o
      WHERE o."userId" = ${userId}
        AND o."date" >= ${start}
        AND o."date" < ${end}
        AND o."type" != 'TRANSFER'
      GROUP BY o."categoryId", o."accountId", o."type"
    `;

    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const [category, account] = await Promise.all([
          row.categoryId
            ? tx.category.findUnique({ where: { id: row.categoryId } })
            : null,
          row.accountId
            ? tx.account.findUnique({ where: { id: row.accountId } })
            : null,
        ]);

        await tx.operationMonthlyRollup.create({
          data: {
            userId,
            yearMonth,
            type: row.type,
            categoryId: row.categoryId,
            accountId: row.accountId,
            totalAmount: row.total,
            operationCount: row.count,
            categoryName: category?.name ?? null,
            categoryIcon: category?.icon ?? null,
            accountName: account?.name ?? null,
          },
        });
      }

      if (options.deleteEnabled) {
        await tx.operation.deleteMany({
          where: {
            userId,
            date: { gte: start, lt: end },
          },
        });
        await this.maybeNotifyFirstArchival(tx, userId);
      }
    });

    return 'archived';
  }

  public async archiveAllUsersForTargetMonth(options: {
    deleteEnabled: boolean;
  }): Promise<void> {
    const yearMonth = getArchiveTargetMonth();
    const users = await this.prisma.user.findMany({ select: { id: true } });

    for (let i = 0; i < users.length; i += 100) {
      const chunk = users.slice(i, i + 100);
      await Promise.all(
        chunk.map((user) =>
          this.archiveMonthForUser(user.id, yearMonth, options),
        ),
      );
    }
  }

  /** Archives every calendar month that still has raw operations before the hot window. */
  public async archiveAllStaleMonths(options: {
    deleteEnabled: boolean;
  }): Promise<{
    monthsProcessed: number;
    usersArchived: number;
    usersSkipped: number;
    archivedMonths: string[];
  }> {
    const hotStart = getHotWindowStartMonth();
    const staleMonthRows = await this.prisma.$queryRaw<
      Array<{ year: number; month: number }>
    >`
      SELECT DISTINCT
        EXTRACT(YEAR FROM o."date" AT TIME ZONE 'Asia/Almaty')::int AS year,
        EXTRACT(MONTH FROM o."date" AT TIME ZONE 'Asia/Almaty')::int AS month
      FROM "Operation" o
      WHERE o."date" < ${hotStart}
      ORDER BY year ASC, month ASC
    `;

    if (staleMonthRows.length === 0) {
      this.logger.log('No stale operation months to archive.');
      return {
        monthsProcessed: 0,
        usersArchived: 0,
        usersSkipped: 0,
        archivedMonths: [],
      };
    }

    const users = await this.prisma.user.findMany({ select: { id: true } });
    let usersArchived = 0;
    let usersSkipped = 0;
    const archivedMonths: string[] = [];

    this.logger.log(
      `Archiving ${staleMonthRows.length} stale month(s) for ${users.length} user(s)...`,
    );

    for (const row of staleMonthRows) {
      const yearMonth = yearMonthFromAlmatyParts(row.year, row.month);
      if (yearMonth >= hotStart) {
        continue;
      }

      archivedMonths.push(
        `${row.year}-${String(row.month).padStart(2, '0')}`,
      );

      for (let i = 0; i < users.length; i += 100) {
        const chunk = users.slice(i, i + 100);
        const results = await Promise.all(
          chunk.map((user) =>
            this.archiveMonthForUser(user.id, yearMonth, options),
          ),
        );

        for (const result of results) {
          if (result === 'archived') {
            usersArchived += 1;
          } else {
            usersSkipped += 1;
          }
        }
      }
    }

    this.logger.log(
      `Stale archival done: months=${archivedMonths.length}, archived=${usersArchived}, skipped=${usersSkipped}`,
    );

    return {
      monthsProcessed: archivedMonths.length,
      usersArchived,
      usersSkipped,
      archivedMonths,
    };
  }

  public async verifyUserMonth(
    userId: string,
    yearMonth: Date,
  ): Promise<{ ok: boolean; diff?: string[] }> {
    const { start, end } = getMonthBoundsInUtc(yearMonth);
    const rollupRows = await this.prisma.operationMonthlyRollup.findMany({
      where: { userId, yearMonth },
    });

    const rawRows = await this.prisma.$queryRaw<ArchiveAggRow[]>`
      SELECT o."categoryId", o."accountId", o."type",
             SUM(o."amount")::decimal AS total,
             COUNT(*)::int AS count
      FROM "Operation" o
      WHERE o."userId" = ${userId}
        AND o."date" >= ${start}
        AND o."date" < ${end}
        AND o."type" != 'TRANSFER'
      GROUP BY o."categoryId", o."accountId", o."type"
    `;

    const rollup = this.sumRollupTotals(rollupRows);
    const raw = this.sumTotals(rawRows);
    const result = reconcileArchiveMonth(rollup, raw);

    if (result.ok === false) {
      this.logger.error(
        `Archive reconcile failed user=${userId} month=${yearMonth.toISOString()}: ${result.diff.join('; ')}`,
      );
    }

    return result;
  }

  private sumRollupTotals(
    rows: Array<{
      type: OperationType;
      totalAmount: Prisma.Decimal;
      operationCount: number;
    }>,
  ) {
    return rows.reduce(
      (acc, row) => {
        const amount = Number(row.totalAmount);
        if (row.type === OperationType.INCOME) {
          acc.incomeTotal += amount;
          acc.incomeCount += row.operationCount;
        } else {
          acc.expenseTotal += amount;
          acc.expenseCount += row.operationCount;
        }
        return acc;
      },
      {
        incomeTotal: 0,
        expenseTotal: 0,
        incomeCount: 0,
        expenseCount: 0,
      },
    );
  }

  private sumTotals(rows: Array<{ type: OperationType; total: Prisma.Decimal; count: number }>) {
    return rows.reduce(
      (acc, row) => {
        const amount = Number(row.total);
        if (row.type === OperationType.INCOME) {
          acc.incomeTotal += amount;
          acc.incomeCount += row.count;
        } else {
          acc.expenseTotal += amount;
          acc.expenseCount += row.count;
        }
        return acc;
      },
      {
        incomeTotal: 0,
        expenseTotal: 0,
        incomeCount: 0,
        expenseCount: 0,
      },
    );
  }

  private async maybeNotifyFirstArchival(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { operationsArchivalNotifiedAt: true },
    });

    if (!user || user.operationsArchivalNotifiedAt) {
      return;
    }

    await tx.notification.create({
      data: {
        scope: NotificationScope.USER,
        userId,
        title: {
          ru: 'История операций обновлена',
          en: 'Operation history updated',
          kz: 'Операциялар тарихы жаңартылды',
        },
        description: {
          ru: 'Операции старше 24 месяцев свёрнуты в статистику. Подробности — в разделе «Графики».',
          en: 'Operations older than 24 months are now summarized. See Charts for details.',
          kz: '24 айдан ескі операциялар статистикаға қысқартылды. Толығырақ — «Графиктер» бөлімінде.',
        },
        buttonText: {
          ru: 'Открыть графики',
          en: 'Open charts',
          kz: 'Графиктерді ашу',
        },
        link: '/charts',
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { operationsArchivalNotifiedAt: new Date() },
    });
  }
}

export { getHotWindowStartMonth };
