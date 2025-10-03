import { CategoryType } from '@prisma/generated';

export const defaultIncomeCategories = [
  {
    name: 'Salary',
    icon: 'credit-card',
  },
  {
    name: 'Freelance',
    icon: 'hand-coins',
  },
  {
    name: 'Investments',
    icon: 'piggy-bank',
  },
];

export const defaultExpenseCategories = [
  {
    name: 'Food',
    icon: 'drumstick',
  },
  {
    name: 'Transport',
    icon: 'bus',
  },
  {
    name: 'Entertainment',
    icon: 'drama',
  },
  {
    name: 'Health',
    icon: 'heart',
  },
  {
    name: 'Domestic',
    icon: 'brush-cleaning',
  },
];

export const defaultCategories = [
  ...defaultIncomeCategories.map((category) => ({
    ...category,
    type: CategoryType.INCOME,
  })),
  ...defaultExpenseCategories.map((category) => ({
    ...category,
    type: CategoryType.EXPENSE,
  })),
];
