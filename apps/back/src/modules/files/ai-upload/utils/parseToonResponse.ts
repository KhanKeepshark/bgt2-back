import { ExtractedOperation } from "@back/shared/types/ai-operations";
import { BadRequestException } from "@nestjs/common";

export const parseToonResponse = (text: string): ExtractedOperation[] => {
    try {
      // Убираем markdown код блоки
      let cleanText = text.replace(/```[a-z]*\s*/gi, '').replace(/```\s*/g, '').trim();
      
      // Ищем формат: ops[N]: или просто ops:
      const opsMatch = cleanText.match(/ops(?:\[(\d+)\])?:\s*\n((?:[^\n]+\n?)+)/i);
      if (!opsMatch) {
        throw new Error('No ops format found in response');
      }
      
      const rowsText = opsMatch[2];
      const rows = rowsText.trim().split('\n').filter(row => {
        const trimmed = row.trim();
        return trimmed && !trimmed.startsWith('//') && trimmed.includes('|');
      });
      
      return rows.map(row => {
        const parts = row.trim().split('|');
        if (parts.length < 5) {
          throw new Error(`Invalid row format: ${row}`);
        }
        
        const [amount, date, type, categoryName, ...descriptionParts] = parts;
        const description = descriptionParts.join('|').trim(); // На случай если в описании есть |
        
        // Конвертируем тип: I -> INCOME, E -> EXPENSE
        const operationType = type.trim().toUpperCase() === 'I' ? 'INCOME' : 'EXPENSE';
        
        return {
          amount: amount.trim(),
          date: date.trim(),
          type: operationType,
          categoryName: categoryName.trim(),
          description: description || '',
        } as ExtractedOperation;
      });
    } catch (error) {
      console.error('Failed to parse response:', error);
      console.error('Response text:', text);
      throw new BadRequestException('Failed to parse AI response. Please check the file format.');
    }
  }