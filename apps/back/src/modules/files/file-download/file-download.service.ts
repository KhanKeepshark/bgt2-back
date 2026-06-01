import { BadRequestException, Injectable } from '@nestjs/common';
import { OperationService } from '@back/modules/accounts/operation/operation.service';
import { User } from '@prisma/generated';
import { OperationsExportFilterInput } from './inputs/operations-export-filter.input';
import * as XLSX from 'xlsx';
import { OperationFilterInput } from '@back/modules/accounts/operation/inputs/operation-filter.input';
import { LimitGateService } from '@back/shared/limit-gate/limit-gate.service';

@Injectable()
export class FileDownloadService {
  constructor(
    private readonly operationService: OperationService,
    private readonly limitGate: LimitGateService,
  ) {}

  public async exportOperationsToExcel(
    user: User,
    filter: OperationsExportFilterInput = {},
  ): Promise<{ filename: string; base64: string; mimeType: string }> {
    await this.limitGate.assertCanExport(user.id);

    // Создаем фильтр для получения операций
    // Если даты не указаны, передаем undefined для получения всех операций
    const operationFilter: OperationFilterInput | undefined =
      filter.dateFrom || filter.dateTo
        ? {
            dateFrom: filter.dateFrom,
            dateTo: filter.dateTo,
          }
        : undefined;

    // Получаем операции через существующий метод
    const operationGroups = await this.operationService.findAllSortedByDays(
      user,
      operationFilter,
    );

    // Собираем все операции в один массив
    const allOperations = operationGroups.flatMap((group) => group.operations);

    if (allOperations.length === 0) {
      throw new BadRequestException('No operations found');
    }

    // Подготавливаем данные для Excel
    const excelData = allOperations.map((operation: any) => ({
      Date: operation.date.toISOString().split('T')[0],
      Description: operation.description,
      Type: operation.type,
      Amount: operation.amount.toString(),
      Category: operation.category?.name || '',
      Account: operation.account.name,
      'Transfer Account': operation.transferAccount?.name || '',
    }));

    // Создаем рабочую книгу
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operations');

    // Генерируем буфер
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Конвертируем в base64
    const base64 = buffer.toString('base64');

    // Генерируем имя файла
    let filename: string;
    if (filter.dateFrom && filter.dateTo) {
      const dateFromStr = filter.dateFrom.toISOString().split('T')[0];
      const dateToStr = filter.dateTo.toISOString().split('T')[0];
      filename = `operations_${dateFromStr}_${dateToStr}.xlsx`;
    } else {
      filename = `operations_all.xlsx`;
    }

    return {
      filename,
      base64,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
