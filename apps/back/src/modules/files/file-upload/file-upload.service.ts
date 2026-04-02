import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import * as Upload from 'graphql-upload/Upload.js';
import * as XLSX from 'xlsx';
import { streamToBuffer } from '../ai-upload/utils/streamToBuffer';
import { ExtractedOperation } from '@back/shared/types/ai-operations';
import { fixEncoding } from '../ai-upload/utils/fixEncoding';
import { getCellRawValue, getCellValue } from '../ai-upload/utils/getCellValue';
import { FileError } from '@back/shared/constants/errors.constants';

type RequiredColumns = 'amount' | 'date' | 'description' | 'type' | 'category';

@Injectable()
export class FileUploadService {
  constructor(private readonly prismaService: PrismaService) {}

  public async parseOperationsFile(
    user: User,
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
        throw new BadRequestException(
          JSON.stringify({ code: FileError.SHEET_MISSING }),
        );
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
            const value =
              cell.w !== undefined
                ? cell.w
                : cell.v !== undefined
                  ? cell.v
                  : '';
            row.push(value);
          } else {
            row.push('');
          }
        }
        rows.push(row);
      }

      if (!rows.length) {
        throw new BadRequestException(
          JSON.stringify({ code: FileError.SHEET_EMPTY }),
        );
      }

      const headerRow = rows[0].map((cell) =>
        `${cell ?? ''}`.trim().toLowerCase(),
      );

      const columnIndexMap = this.buildColumnIndexMap(headerRow);
      const operations: ExtractedOperation[] = [];

      const categories = await this.prismaService.category.findMany({
        where: { userId: user.id },
        select: {
          name: true,
          type: true,
          icon: true,
          keywords: {
            select: {
              phrase: true,
            },
          },
        },
      });
      const categoryIndex = this.buildCategoryIndex(categories);

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || row.every((cell) => `${cell ?? ''}`.trim() === '')) {
          continue;
        }

        const amount = getCellValue(row, columnIndexMap.amount);
        const date = getCellRawValue(row, columnIndexMap.date);
        const description = fixEncoding(
          getCellValue(row, columnIndexMap.description, true),
        );
        const type = getCellValue(row, columnIndexMap.type);
        let categoryName = fixEncoding(
          getCellValue(row, columnIndexMap.category),
        );

        if (!amount || !date || !type) {
          throw new BadRequestException(
            JSON.stringify({
              code: FileError.ROW_EMPTY_REQUIRED_FIELDS,
              params: { row: rowIndex + 1 },
            }),
          );
        }

        const normalizedType = type.trim().toUpperCase();
        if (
          normalizedType !== 'INCOME' &&
          normalizedType !== 'EXPENSE' &&
          normalizedType !== 'TRANSFER'
        ) {
          throw new BadRequestException(
            JSON.stringify({
              code: FileError.ROW_INVALID_TYPE,
              params: { row: rowIndex + 1, type },
            }),
          );
        }

        let matchedKeyword: boolean = false;
        let categoryIcon: string | undefined = undefined;

        const normalizedDescription = description?.toLowerCase().trim() ?? '';
        if (normalizedDescription && normalizedType !== 'TRANSFER') {
          const autoCategory = this.findCategoryByKeywordsInIndex(
            normalizedDescription,
            normalizedType as 'INCOME' | 'EXPENSE',
            categoryIndex,
          );
          if (autoCategory) {
            categoryName = autoCategory.name;
            categoryIcon = autoCategory.icon;
            matchedKeyword = true;
          }
        }

        const trimmedCategoryName = categoryName.trim();
        if (!trimmedCategoryName) {
          throw new BadRequestException(
            JSON.stringify({
              code: FileError.ROW_EMPTY_CATEGORY,
              params: { row: rowIndex + 1 },
            }),
          );
        }
        categoryName = trimmedCategoryName;

        // Если иконка еще не найдена (категория из файла), ищем по имени
        if (!categoryIcon) {
          const normalizedCategoryName = categoryName.toLowerCase();
          categoryIcon =
            categoryIndex.byTypeName[
              normalizedType as 'INCOME' | 'EXPENSE' | 'TRANSFER'
            ]?.get(normalizedCategoryName) || undefined;
        }

        const normalizedDate = this.normalizeDateValue(date);
        const normalizedAmount = amount.replace(/\s/g, '').replace(',', '.');

        operations.push({
          amount: Math.abs(parseFloat(normalizedAmount)).toString(),

          date: normalizedDate,
          description: description || undefined,
          type: normalizedType as 'INCOME' | 'EXPENSE' | 'TRANSFER',
          categoryName,
          categoryIcon,
          containsKeyword: matchedKeyword,
        });
      }

      if (!operations.length) {
        throw new BadRequestException(
          JSON.stringify({ code: FileError.NO_ROWS }),
        );
      }

      return operations;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        JSON.stringify({ code: FileError.PARSE_ERROR }),
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
          JSON.stringify({
            code: FileError.COLUMN_MISSING,
            params: { column },
          }),
        );
      }

      indexMap[column] = headerIndex;
    }

    return indexMap;
  }

  private normalizeDateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const date = new Date(
          Date.UTC(
            parsed.y,
            parsed.m - 1,
            parsed.d,
            parsed.H,
            parsed.M,
            parsed.S,
          ),
        );
        return date.toISOString();
      }
      const dateFromSerial = new Date(
        Math.round((value - 25569) * 86400 * 1000),
      );
      if (!Number.isNaN(dateFromSerial.getTime())) {
        return dateFromSerial.toISOString();
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new BadRequestException(
          JSON.stringify({ code: FileError.DATE_EMPTY }),
        );
      }

      const localized = this.tryParseLocalizedDate(trimmed);
      if (localized) {
        return localized;
      }

      const direct = new Date(trimmed);
      if (!Number.isNaN(direct.getTime())) {
        return direct.toISOString();
      }
    }

    throw new BadRequestException(
      JSON.stringify({
        code: FileError.DATE_PARSE_ERROR,
        params: { value: value as string },
      }),
    );
  }

  private buildCategoryIndex(
    categories: Array<{
      name: string;
      type: string;
      icon: string;
      keywords: Array<{ phrase: string }>;
    }>,
  ) {
    const byTypeKeywords: Record<
      'INCOME' | 'EXPENSE',
      Array<{ keyword: string; name: string; icon: string }>
    > = {
      INCOME: [],
      EXPENSE: [],
    };
    const byTypeName: Record<
      'INCOME' | 'EXPENSE' | 'TRANSFER',
      Map<string, string>
    > = {
      INCOME: new Map(),
      EXPENSE: new Map(),
      TRANSFER: new Map(),
    };

    for (const category of categories) {
      const normalizedType = category.type as 'INCOME' | 'EXPENSE';
      const normalizedName = category.name.toLowerCase().trim();
      if (normalizedName) {
        byTypeName[normalizedType]?.set(normalizedName, category.icon);
      }

      for (const keyword of category.keywords) {
        const normalizedKeyword = keyword.phrase.toLowerCase().trim();
        if (normalizedKeyword) {
          byTypeKeywords[normalizedType].push({
            keyword: normalizedKeyword,
            name: category.name,
            icon: category.icon,
          });
        }
      }
    }

    return { byTypeKeywords, byTypeName };
  }

  private findCategoryByKeywordsInIndex(
    normalizedDescription: string,
    type: 'INCOME' | 'EXPENSE',
    categoryIndex: {
      byTypeKeywords: Record<
        'INCOME' | 'EXPENSE',
        Array<{ keyword: string; name: string; icon: string }>
      >;
    },
  ): { name: string; icon: string } | null {
    for (const entry of categoryIndex.byTypeKeywords[type]) {
      if (normalizedDescription.includes(entry.keyword)) {
        return { name: entry.name, icon: entry.icon };
      }
    }

    return null;
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
}
