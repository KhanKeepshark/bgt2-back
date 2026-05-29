import 'dotenv/config';
import { PrismaClient, SubscriptionType, CategoryType } from './generated';
import { hash } from 'argon2';
import { FREE_PLAN_LIMITS, PREMIUM_PLAN_LIMITS } from './subscription-plan-limits';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'test@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

async function syncAdminUser(userId: string) {
  const emailTaken = await prisma.user.findFirst({
    where: { email: ADMIN_EMAIL, NOT: { id: userId } },
  });

  if (emailTaken) {
    throw new Error(
      `Email ${ADMIN_EMAIL} уже занят другим пользователем (${emailTaken.id})`,
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: ADMIN_EMAIL,
      password: await hash(ADMIN_PASSWORD),
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  console.log(`✅ Админ обновлён: ${ADMIN_EMAIL}`);
}

const defaultCategories = [
  { name: 'Salary', icon: 'credit-card', type: CategoryType.INCOME },
  { name: 'Freelance', icon: 'hand-coins', type: CategoryType.INCOME },
  { name: 'Investments', icon: 'piggy-bank', type: CategoryType.INCOME },
  { name: 'Food', icon: 'drumstick', type: CategoryType.EXPENSE },
  { name: 'Transport', icon: 'bus', type: CategoryType.EXPENSE },
  { name: 'Entertainment', icon: 'drama', type: CategoryType.EXPENSE },
  { name: 'Health', icon: 'heart', type: CategoryType.EXPENSE },
  { name: 'Domestic', icon: 'brush-cleaning', type: CategoryType.EXPENSE },
];

async function main() {
  console.log('🔍 Проверка наличия админа в БД...');

  // 1. Ensure FREE plan (create or patch limits on re-run)
  const existingFreePlan = await prisma.subscriptionPlan.findUnique({
    where: { type: SubscriptionType.FREE },
  });

  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { type: SubscriptionType.FREE },
    create: {
      type: SubscriptionType.FREE,
      description: 'Бесплатный план',
      ...FREE_PLAN_LIMITS,
      prices: {
        create: {
          name: 'Free',
          price: 0,
          currency: 'USD',
          durationDays: null,
        },
      },
    },
    update: FREE_PLAN_LIMITS,
    include: { prices: true },
  });

  console.log(
    existingFreePlan ? '✅ План FREE обновлён' : '✅ План FREE создан',
  );

  // 2. Ensure PREMIUM plan (create or patch limits on re-run)
  const existingPremiumPlan = await prisma.subscriptionPlan.findUnique({
    where: { type: SubscriptionType.PREMIUM },
  });

  await prisma.subscriptionPlan.upsert({
    where: { type: SubscriptionType.PREMIUM },
    create: {
      type: SubscriptionType.PREMIUM,
      description: 'Премиум план',
      ...PREMIUM_PLAN_LIMITS,
      prices: {
        create: [
          {
            name: 'Monthly',
            price: 5,
            currency: 'USD',
            durationDays: 30,
          },
          {
            name: 'Yearly',
            price: 50,
            currency: 'USD',
            durationDays: 365,
          },
        ],
      },
    },
    update: PREMIUM_PLAN_LIMITS,
    include: { prices: true },
  });

  console.log(
    existingPremiumPlan
      ? '✅ План PREMIUM обновлён'
      : '✅ План PREMIUM создан',
  );

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (existingAdmin) {
    await syncAdminUser(existingAdmin.id);
    return;
  }

  // Проверяем, есть ли пользователь с таким email (может быть USER)
  const existingUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingUser) {
    await syncAdminUser(existingUser.id);
    return;
  }

  console.log(`📝 Создание админа ${ADMIN_EMAIL}...`);

  // Используем FREE план для админа по умолчанию
  const plan = freePlan!;
  const price = plan.prices[0];
  const subscriptionStartedAt = new Date();
  const subscriptionExpiresAt = price?.durationDays
    ? new Date(
        subscriptionStartedAt.getTime() + price.durationDays * 24 * 60 * 60 * 1000,
      )
    : null;

  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: await hash(ADMIN_PASSWORD),
      name: 'Admin',
      role: 'ADMIN',
      isEmailVerified: true,
      subscriptionPlanId: plan.id,
      subscriptionPriceId: price?.id ?? null,
      subscriptionStartedAt,
      subscriptionExpiresAt,
      tokensBalance: plan.tokensOnPurchase ?? 0,
    },
  });

  // Создаём дефолтный счёт
  const account = await prisma.account.create({
    data: {
      name: 'Default',
      icon: 'wallet',
      currency: 'USD',
      initialBalance: '0',
      balance: '0',
      userId: user.id,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultAccountId: account.id },
  });

  // Создаём дефолтные категории
  for (const category of defaultCategories) {
    await prisma.category.create({
      data: {
        name: category.name,
        icon: category.icon,
        type: category.type,
        userId: user.id,
      },
    });
  }

  console.log(`✅ Админ создан: ${ADMIN_EMAIL}`);
  console.log(`   Пароль: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
