export interface ExtractedOperation {
  amount: string;
  date: string; 
  description?: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  categoryName: string;
}