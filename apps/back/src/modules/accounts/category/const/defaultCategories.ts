import { CategoryType } from '@prisma/generated';

const defaultIncomeCategoriesMap: Record<
  string,
  { name: string; icon: string }[]
> = {
  en: [
    { name: 'Salary', icon: 'credit-card' },
    { name: 'Freelance', icon: 'hand-coins' },
    { name: 'Investments', icon: 'piggy-bank' },
  ],
  ru: [
    { name: 'Зарплата', icon: 'credit-card' },
    { name: 'Фриланс', icon: 'hand-coins' },
    { name: 'Инвестиции', icon: 'piggy-bank' },
  ],
  kz: [
    { name: 'Жалақы', icon: 'credit-card' },
    { name: 'Фриланс', icon: 'hand-coins' },
    { name: 'Инвестициялар', icon: 'piggy-bank' },
  ],
};

const defaultExpenseCategoriesMap: Record<
  string,
  { name: string; icon: string }[]
> = {
  en: [
    { name: 'Food', icon: 'drumstick' },
    { name: 'Transport', icon: 'bus' },
    { name: 'Entertainment', icon: 'drama' },
    { name: 'Health', icon: 'heart' },
    { name: 'Domestic', icon: 'brush-cleaning' },
  ],
  ru: [
    { name: 'Еда', icon: 'drumstick' },
    { name: 'Транспорт', icon: 'bus' },
    { name: 'Развлечения', icon: 'drama' },
    { name: 'Здоровье', icon: 'heart' },
    { name: 'Бытовые нужды', icon: 'brush-cleaning' },
  ],
  kz: [
    { name: 'Тамақ', icon: 'drumstick' },
    { name: 'Көлік', icon: 'bus' },
    { name: 'Ойын-сауық', icon: 'drama' },
    { name: 'Денсаулық', icon: 'heart' },
    { name: 'Тұрмыстық', icon: 'brush-cleaning' },
  ],
};

export const getDefaultCategories = (language?: string) => {
  const lang =
    language && defaultIncomeCategoriesMap[language] ? language : 'ru';
  const income = defaultIncomeCategoriesMap[lang];
  const expense = defaultExpenseCategoriesMap[lang];

  return [
    ...income.map((category) => ({
      ...category,
      type: CategoryType.INCOME,
    })),
    ...expense.map((category) => ({
      ...category,
      type: CategoryType.EXPENSE,
    })),
  ];
};
