import type { ExtractedOperation } from '@back/shared/types/ai-operations';
import { BadRequestException } from '@nestjs/common';
import { fixEncoding } from './fixEncoding';
import { AiUploadError } from '@back/shared/constants/errors.constants';

export const parseToonResponse = (text: string): ExtractedOperation[] => {
  try {
    // Убираем markdown код блоки и исправляем кодировку если нужно
    let cleanText = fixEncoding(
      text
        .replace(/```[a-z]*\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim(),
    );

    // === УНИВЕРСАЛЬНЫЕ ОШИБКИ ===
    if (cleanText === 'ERR_NR') {
      throw new BadRequestException(AiUploadError.INVALID_DOCUMENT);
    }
    if (cleanText === 'ERR_UR') {
      throw new BadRequestException(AiUploadError.UNREADABLE);
    }
    if (cleanText === 'ERR_ND') {
      throw new BadRequestException(AiUploadError.NO_DATA);
    }
    // ============================

    // Убираем возможные префиксы ops[N]: для обратной совместимости
    cleanText = cleanText.replace(/ops(?:\[\d+\])?:\s*\n?/gi, '');

    // Парсим строки с разделителями |
    const rows = cleanText
      .trim()
      .split('\n')
      .filter((row) => {
        const trimmed = row.trim();
        // Строка должна содержать хотя бы 3 разделителя | для 4 полей
        // И не должна начинаться с // (комментарий)
        // И не должна быть заголовком таблицы (если AI решит добавить)
        if (
          !trimmed ||
          trimmed.startsWith('//') ||
          trimmed.toLowerCase().startsWith('amount|')
        )
          return false;

        return (trimmed.match(/\|/g) || []).length >= 3;
      });

    if (rows.length === 0) {
      throw new BadRequestException(AiUploadError.PARSE_ERROR);
    }

    return rows.map((row) => {
      const parts = row.trim().split('|');

      // Очистка суммы: убираем все кроме цифр, точки и минуса
      let amount = (parts[0] || '')
        .trim()
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');
      // Если минус в начале, оставляем, если в середине - убираем (ошибка парсинга)
      if (amount.indexOf('-', 1) > 0) {
        amount = amount.replace(/-/g, '');
      }

      const date = (parts[1] || '').trim();
      const typeStr = (parts[2] || '').trim().toUpperCase();
      // Описание может содержать | поэтому объединяем остаток
      const description = parts.slice(3).join('|').trim();

      // Конвертируем тип: I -> INCOME, E -> EXPENSE
      let operationType: 'INCOME' | 'EXPENSE' = 'EXPENSE';
      if (typeStr === 'I' || typeStr === 'INCOME') operationType = 'INCOME';
      else if (typeStr === 'E' || typeStr === 'EXPENSE')
        operationType = 'EXPENSE';

      return {
        amount,
        date,
        type: operationType,
        categoryName: '',
        description: description || '',
        containsKeyword: false,
      } as ExtractedOperation;
    });
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    console.error('Failed to parse response:', error);
    console.error('Response text:', text);
    throw new BadRequestException(AiUploadError.PARSE_ERROR);
  }
};
