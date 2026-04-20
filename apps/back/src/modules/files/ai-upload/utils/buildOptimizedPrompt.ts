export const buildOptimizedPrompt = (): string => {
  return `Task: Extract financial operations from the provided file (image, document, or spreadsheet).
Output: Plain text only. No JSON/Markdown.
Format: amount|date|type|description
Types: I=Income, E=Expense
Date: YYYY-MM-DD
Description: Max 20 chars. Extract the exact merchant name or item. If the description is missing in the file, infer a short, logical description based on the document's context (e.g., "Transfer", "Groceries", "Unknown").

Error Handling:
If file is NOT a financial document (receipt, invoice, bank statement, report) -> return "ERR_NR"
If content is unreadable, corrupted, or empty -> return "ERR_UR"
If no financial data (amount/date) found -> return "ERR_ND"

Example:
100|2025-01-01|I|Salary Jan
50.5|2025-01-02|E|Magnum Food`;
};
