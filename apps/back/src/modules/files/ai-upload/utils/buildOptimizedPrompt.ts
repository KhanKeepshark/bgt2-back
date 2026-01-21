  export const buildOptimizedPrompt = (
    categories: Array<{ id: string; name: string; type: string }>,
  ): string => {
    const incomeCategories = categories
      .filter(c => c.type === 'INCOME')
      .map(c => c.name)
      .join(',');
    const expenseCategories = categories
      .filter(c => c.type === 'EXPENSE')
      .map(c => c.name)
      .join(',');

    return `Извлеки операции из файла. 

ВАЖНО: Используй ТОЛЬКО текстовый формат с разделителями |. НЕ используй JSON, НЕ используй markdown код блоки. НЕ добавляй префиксы перед строками.

Формат ответа (каждая строка - одна операция):
amount|date|type|category|description

Правила:
- amount: число без валюты
- date: YYYY-MM-DD
- type: I (INCOME) или E (EXPENSE)
- category: из списка ниже (точное или ближайшее)
- description: до 50 символов

Доходы: ${incomeCategories}
Расходы: ${expenseCategories}

Пример правильного ответа:
787|2025-11-11|E|Food|IP SAUDAGER
1847|2025-11-11|E|Food|TOO SALEKZ

НЕ используй JSON формат. Только строки с разделителями | как в примере выше.`;
  }
