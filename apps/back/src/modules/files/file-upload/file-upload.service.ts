import { BadRequestException, Injectable } from '@nestjs/common';
import * as Upload from 'graphql-upload/Upload.js';
import * as XLSX from 'xlsx';
import { streamToBuffer } from '../ai-upload/utils/streamToBuffer';
import { ExtractedOperation } from '@back/shared/types/ai-operations';

type RequiredColumns =
  | 'amount'
  | 'date'
  | 'description'
  | 'type'
  | 'category';

@Injectable()
export class FileUploadService {
  public async parseOperationsFile(
    file: Upload,
  ): Promise<ExtractedOperation[]> {
    try {
      const buffer = await streamToBuffer(file.createReadStream());
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        codepage: 65001, // Try to enforce UTF-8
        cellText: false,
        cellDates: true,
      });

      if (!workbook.SheetNames.length) {
        throw new BadRequestException('Spreadsheet does not contain sheets');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Получаем диапазон ячеек
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const rows: (string | number)[][] = [];
      
      // Читаем строки напрямую из ячеек, сохраняя исходную кодировку
      for (let R = range.s.r; R <= range.e.r; R++) {
        const row: (string | number)[] = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell) {
            // Используем w (formatted text) если доступен, иначе v (raw value)
            const value = cell.w !== undefined ? cell.w : (cell.v !== undefined ? cell.v : '');
            row.push(value);
          } else {
            row.push('');
          }
        }
        rows.push(row);
      }

      if (!rows.length) {
        throw new BadRequestException('Spreadsheet is empty');
      }

      const headerRow = rows[0].map((cell) =>
        `${cell ?? ''}`.trim().toLowerCase(),
      );

      const columnIndexMap = this.buildColumnIndexMap(headerRow);
      const operations: ExtractedOperation[] = [];

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || row.every((cell) => `${cell ?? ''}`.trim() === '')) {
          continue;
        }

        const amount = this.getCellValue(row, columnIndexMap.amount);
        const date = this.getCellRawValue(row, columnIndexMap.date);
        const description = this.fixEncoding(this.getCellValue(
          row,
          columnIndexMap.description,
          true,
        ));
        const type = this.getCellValue(row, columnIndexMap.type);
        const categoryName = this.fixEncoding(this.getCellValue(row, columnIndexMap.category));

        if (!amount || !date || !type || !categoryName) {
          throw new BadRequestException(
            `Row ${rowIndex + 1} contains empty required fields`,
          );
        }

        const normalizedType = type.toUpperCase();
        if (
          normalizedType !== 'INCOME' &&
          normalizedType !== 'EXPENSE' &&
          normalizedType !== 'TRANSFER'
        ) {
          throw new BadRequestException(
            `Row ${rowIndex + 1} has invalid type "${type}". Allowed values: INCOME, EXPENSE, TRANSFER`,
          );
        }

        const normalizedDate = this.normalizeDateValue(date);

        operations.push({
          amount: Math.abs(parseFloat(amount)).toString(),
          date: normalizedDate,
          description: description || undefined,
          type: normalizedType as 'INCOME' | 'EXPENSE' | 'TRANSFER',
          categoryName,
        });
      }

      if (!operations.length) {
        throw new BadRequestException('No rows with operations were found');
      }

      return operations;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to parse operations from the provided file',
      );
    }
  }

  private buildColumnIndexMap(
    headerRow: string[],
  ): Record<RequiredColumns, number> {
    const requiredColumns: RequiredColumns[] = [
      'amount',
      'date',
      'description',
      'type',
      'category',
    ];

    const indexMap = {} as Record<RequiredColumns, number>;

    for (const column of requiredColumns) {
      const normalizedColumn = column.toLowerCase();
      const headerIndex = headerRow.findIndex(
        (header) => header === normalizedColumn,
      );

      if (headerIndex === -1) {
        throw new BadRequestException(
          `Column "${column}" was not found in header row`,
        );
      }

      indexMap[column] = headerIndex;
    }

    return indexMap;
  }

  private getCellValue(
    row: (string | number)[],
    index: number,
    optional = false,
  ): string {
    const raw = this.getCellRawValue(row, index);
    if ((raw === undefined || raw === null || raw === '') && optional) {
      return '';
    }
    return `${raw ?? ''}`.trim();
  }

  private getCellRawValue(row: (string | number)[], index: number) {
    return row[index];
  }

  private normalizeDateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const date = new Date(
          Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S),
        );
        return date.toISOString();
      }
      const dateFromSerial = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!Number.isNaN(dateFromSerial.getTime())) {
        return dateFromSerial.toISOString();
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new BadRequestException('Date value cannot be empty');
      }

      const direct = new Date(trimmed);
      if (!Number.isNaN(direct.getTime())) {
        return direct.toISOString();
      }

      const localized = this.tryParseLocalizedDate(trimmed);
      if (localized) {
        return localized;
      }
    }

    throw new BadRequestException(
      `Unable to parse date value "${value as string}"`,
    );
  }

  private tryParseLocalizedDate(value: string): string | null {
    const match = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (!match) {
      return null;
    }

    const [, dayStr, monthStr, yearStr] = match;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr.length === 2 ? `20${yearStr}` : yearStr);

    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private fixEncoding(str: string): string {
    // If the string contains characters > 255, it is likely already correctly parsed Unicode
    if (/[^\u0000-\u00FF]/.test(str)) {
      return str;
    }

    try {
      // Try to interpret the string as bytes (Latin-1) and decode as UTF-8
      const decoded = Buffer.from(str, 'binary').toString('utf8');
      
      // If the result contains replacement characters, the "binary" assumption was probably wrong
      if (decoded.includes('\ufffd')) {
        return str;
      }
      
      return decoded;
    } catch {
      return str;
    }
  }
}
