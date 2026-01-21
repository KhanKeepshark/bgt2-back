import { ExtractedOperation } from "@back/shared/types/ai-operations";
import { BadRequestException } from "@nestjs/common";
import { fixEncoding } from "./fixEncoding";

export const parseToonResponse = (text: string): ExtractedOperation[] => {
    try {
      // Убираем markdown код блоки и исправляем кодировку если нужно
      let cleanText = fixEncoding(text.replace(/```[a-z]*\s*/gi, '').replace(/```\s*/g, '').trim());
      
      // Убираем возможные префиксы ops[N]: для обратной совместимости
      cleanText = cleanText.replace(/ops(?:\[\d+\])?:\s*\n?/gi, '');
      
      // Парсим строки с разделителями |
      const rows = cleanText.trim().split('\n').filter(row => {
        const trimmed = row.trim();
        // Строка должна содержать хотя бы 4 разделителя | для 5 полей
        return trimmed && !trimmed.startsWith('//') && (trimmed.match(/\|/g) || []).length >= 4;
      });
      
      if (rows.length === 0) {
        throw new Error('No valid operation rows found in response');
      }
      
      return rows.map(row => {
        const parts = row.trim().split('|');
        
        const amount = (parts[0] || '').trim().replace(',', '.').replace(/^-/, '');
        const date = (parts[1] || '').trim();
        const typeStr = (parts[2] || '').trim().toUpperCase();
        const categoryName = (parts[3] || '').trim();
        const description = parts.slice(4).join('|').trim();
        
        // Конвертируем тип: I -> INCOME, E -> EXPENSE
        const operationType = typeStr === 'I' ? 'INCOME' : 'EXPENSE';
        
        return {
          amount,
          date,
          type: operationType,
          categoryName,
          description: description || '',
          containsKeyword: false,
        } as ExtractedOperation;
      });
    } catch (error) {
      console.error('Failed to parse response:', error);
      console.error('Response text:', text);
      throw new BadRequestException(`Failed to parse AI response: ${error.message}`);
    }
  }
