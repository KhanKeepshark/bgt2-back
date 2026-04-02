export const buildOptimizedPrompt = (
  categories: Array<{ id: string; name: string; type: string }>,
): string => {
  const sanitize = (name: string) => name.replace(/[|\n]/g, ' ').trim();

  const incomeCategories = categories
    .filter((c) => c.type === 'INCOME')
    .map((c) => sanitize(c.name))
    .join(',');
  const expenseCategories = categories
    .filter((c) => c.type === 'EXPENSE')
    .map((c) => sanitize(c.name))
    .join(',');

  return `Task: Extract financial operations from the provided file (image, document, or spreadsheet).
Output: Plain text only. No JSON/Markdown.
Format: amount|date|type|category|description
Types: I=Income, E=Expense
Date: YYYY-MM-DD
Income Cats: ${incomeCategories}
Expense Cats: ${expenseCategories}

Error Handling:
If file is NOT a financial document (receipt, invoice, bank statement, report) -> return "ERR_NR"
If content is unreadable, corrupted, or empty -> return "ERR_UR"
If no financial data (amount/date) found -> return "ERR_ND"

Example:
100|2025-01-01|I|Salary|Salary Jan
50.5|2025-01-02|E|Food|Lunch`;
};
