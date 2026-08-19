import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/generated';
import { OperationsExportFilterInput } from './inputs/operations-export-filter.input';
import * as XLSX from 'xlsx';
import { LimitGateService } from '@back/shared/limit-gate/limit-gate.service';
import { UserActivityService } from '@back/modules/user-stats/user-activity.service';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { getHotWindowStartMonth } from '@back/shared/operation-retention/operation-retention.util';

@Injectable()
export class FileDownloadService {
  constructor(
    private readonly limitGate: LimitGateService,
    private readonly userActivityService: UserActivityService,
    private readonly prisma: PrismaService,
  ) {}

  private resolveHotExportRange(filter: OperationsExportFilterInput = {}): {
    dateFrom: Date;
    dateTo: Date;
  } {
    const hotStart = getHotWindowStartMonth();
    const today = new Date();

    if (!filter.dateFrom && !filter.dateTo) {
      return { dateFrom: hotStart, dateTo: today };
    }

    const from = filter.dateFrom ?? hotStart;
    const to = filter.dateTo ?? today;

    if (to < hotStart) {
      throw new BadRequestException('EXPORT_PERIOD_BEFORE_RETENTION');
    }

    return {
      dateFrom: from < hotStart ? hotStart : from,
      dateTo: to,
    };
  }

  public async exportOperationsToExcel(
    user: User,
    filter: OperationsExportFilterInput = {},
  ): Promise<{ filename: string; base64: string; mimeType: string }> {
    await this.limitGate.assertCanExport(user.id);

    const { dateFrom, dateTo } = this.resolveHotExportRange(filter);

    const operations = await this.prisma.operation.findMany({
      where: {
        userId: user.id,
        date: { gte: dateFrom, lte: dateTo },
      },
      include: {
        account: true,
        category: true,
        transferAccount: true,
      },
      orderBy: { date: 'desc' },
    });

    if (operations.length === 0) {
      throw new BadRequestException('No operations found');
    }

    const excelData = operations.map((operation) => ({
      Date: operation.date.toISOString().split('T')[0],
      Description: operation.description,
      Type: operation.type,
      Amount: operation.amount.toString(),
      Category: operation.category?.name || '',
      Account: operation.account?.name || '',
      'Transfer Account': operation.transferAccount?.name || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operations');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const base64 = buffer.toString('base64');
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = dateTo.toISOString().split('T')[0];
    const filename = `operations_${dateFromStr}_${dateToStr}.xlsx`;

    await this.userActivityService.logExportSuccess(user.id);

    return {
      filename,
      base64,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  public async exportArchivedOperationsToExcel(
    user: User,
  ): Promise<{ filename: string; base64: string; mimeType: string }> {
    await this.limitGate.assertCanExport(user.id);

    const hotStart = getHotWindowStartMonth();
    const rows = await this.prisma.operationMonthlyRollup.findMany({
      where: {
        userId: user.id,
        yearMonth: { lt: hotStart },
      },
      orderBy: [{ yearMonth: 'asc' }, { type: 'asc' }, { categoryName: 'asc' }],
    });

    if (rows.length === 0) {
      throw new BadRequestException('EXPORT_NO_ARCHIVED_DATA');
    }

    const formatMonth = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Almaty',
        year: 'numeric',
        month: '2-digit',
      });
      const parts = Object.fromEntries(
        formatter.formatToParts(date).map((p) => [p.type, p.value]),
      );
      return `${parts.year}-${parts.month}`;
    };

    const excelData = rows.map((row) => ({
      Month: formatMonth(row.yearMonth),
      Type: row.type,
      Category: row.categoryName ?? '',
      Account: row.accountName ?? '',
      Total: row.totalAmount.toString(),
      Count: row.operationCount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MonthlySummary');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    const base64 = buffer.toString('base64');
    const oldest = formatMonth(rows[0].yearMonth);
    const newest = formatMonth(rows[rows.length - 1].yearMonth);
    const filename = `operations_archive_${oldest}_to_${newest}.xlsx`;

    await this.userActivityService.logExportSuccess(user.id);

    return {
      filename,
      base64,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
