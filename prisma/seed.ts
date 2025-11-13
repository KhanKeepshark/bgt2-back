import { PrismaClient, OperationType, CategoryType, Prisma } from './generated';

const prisma = new PrismaClient();

// Описания для операций
const expenseDescriptions = [
  'Покупка продуктов',
  'Обед в ресторане',
  'Проезд на метро',
  'Такси',
  'Кино',
  'Кафе',
  'Аптека',
  'Химчистка',
  'Ремонт',
  'Интернет',
  'Мобильная связь',
  'Покупка одежды',
  'Спортзал',
  'Книги',
  'Подарки',
];

const incomeDescriptions = [
  'Зарплата',
  'Фриланс проект',
  'Дивиденды',
  'Возврат средств',
  'Бонус',
  'Подработка',
];

// Функция для получения случайного элемента из массива
function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Array is empty');
  }
  return array[Math.floor(Math.random() * array.length)];
}

// Функция для получения случайного числа в диапазоне
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Функция для получения случайной даты в диапазоне
function getRandomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

async function main() {
  console.log('🌱 Начинаем seed...');

  // Получаем email из переменной окружения или используем дефолтный
  const userEmail = 'test@admin.com'

  // Находим пользователя
  const user = await prisma.user.findFirst({
    where: { email: userEmail },
  });

  if (!user) {
    console.error(`❌ Пользователь с email ${userEmail} не найден`);
    console.error('   Укажите существующий email через SEED_USER_EMAIL=your@email.com');
    process.exit(1);
  }

  console.log(`✅ Пользователь найден (${userEmail})`);

  // Находим аккаунты
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
  });

  if (accounts.length === 0) {
    console.error('❌ У пользователя нет аккаунтов');
    process.exit(1);
  }

  console.log(`✅ Найдено ${accounts.length} аккаунтов`);

  // Находим категории
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
  });

  if (categories.length === 0) {
    console.error('❌ У пользователя нет категорий');
    process.exit(1);
  }

  console.log(`✅ Найдено ${categories.length} категорий`);

  // Разделяем категории на доходы и расходы
  const incomeCategories = categories.filter(
    (cat) => cat.type === CategoryType.INCOME,
  );
  const expenseCategories = categories.filter(
    (cat) => cat.type === CategoryType.EXPENSE,
  );

  if (incomeCategories.length === 0 || expenseCategories.length === 0) {
    console.error('❌ Недостаточно категорий для создания операций');
    process.exit(1);
  }

  if (accounts.length === 0) {
    console.error('❌ Недостаточно аккаунтов для создания операций');
    process.exit(1);
  }

  // Вычисляем даты для последних 3 месяцев
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  console.log('💰 Создаем операции за последние 3 месяца...');

  const operations: Prisma.OperationUncheckedCreateInput[] = [];
  const operationsToCreate = 200; // Примерно 200 операций за 3 месяца

  // Создаем операции
  for (let i = 0; i < operationsToCreate; i++) {
    const date = getRandomDate(threeMonthsAgo, now);
    const account = getRandomElement(accounts);
    const isIncome = Math.random() < 0.2; // 20% доходов, 80% расходов
    const isTransfer = !isIncome && Math.random() < 0.1; // 10% переводов среди расходов

    if (isTransfer && accounts.length > 1) {
      // Перевод между счетами
      const transferAccount = getRandomElement(
        accounts.filter((acc) => acc.id !== account.id),
      );
      const amount = getRandomNumber(1000, 50000);

      operations.push({
        amount: amount.toString(),
        date: date,
        description: `Перевод на ${transferAccount.name}`,
        type: OperationType.TRANSFER,
        userId: user.id,
        accountId: account.id,
        transferAccountId: transferAccount.id,
        categoryId: null,
      });
    } else if (isIncome) {
      // Доход
      const category = getRandomElement(incomeCategories);
      const amount = getRandomNumber(20000, 150000);

      operations.push({
        amount: amount.toString(),
        date: date,
        description: getRandomElement(incomeDescriptions),
        type: OperationType.INCOME,
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        transferAccountId: null,
      });
    } else {
      // Расход
      const category = getRandomElement(expenseCategories);
      const amount = getRandomNumber(100, 10000);

      operations.push({
        amount: amount.toString(),
        date: date,
        description: getRandomElement(expenseDescriptions),
        type: OperationType.EXPENSE,
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        transferAccountId: null,
      });
    }
  }

  // Создаем операции батчами для производительности
  const batchSize = 50;
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    await prisma.operation.createMany({
      data: batch,
    });
    console.log(
      `   Создано ${Math.min(i + batchSize, operations.length)} из ${operations.length} операций`,
    );
  }

  console.log(`✅ Создано ${operations.length} операций`);

  // Обновляем балансы счетов на основе операций
  console.log('💼 Обновляем балансы счетов...');
  for (const account of accounts) {
    const accountOperations = await prisma.operation.findMany({
      where: {
        OR: [
          { accountId: account.id },
          { transferAccountId: account.id },
        ],
      },
    });

    let balance = 0;
    for (const op of accountOperations) {
      if (op.type === OperationType.INCOME) {
        balance += Number(op.amount);
      } else if (op.type === OperationType.EXPENSE) {
        balance -= Number(op.amount);
      } else if (op.type === OperationType.TRANSFER) {
        if (op.accountId === account.id) {
          balance -= Number(op.amount);
        } else if (op.transferAccountId === account.id) {
          balance += Number(op.amount);
        }
      }
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { balance: balance },
    });
  }

  console.log('✅ Балансы обновлены');
  console.log('🎉 Seed завершен успешно!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при выполнении seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

