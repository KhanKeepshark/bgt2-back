import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '@back/core/prisma/prisma.service';
import type { User, SubscriptionPlan } from '@prisma/generated';

/**
 * Проверяет лимиты подписки перед созданием ресурса
 */
export class SubscriptionLimitsChecker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly user: User & { subscriptionPlan: SubscriptionPlan },
  ) {}

  /**
   * Проверяет лимит операций в текущем месяце
   */
  async checkOperationsPerMonthLimit(): Promise<void> {
    const plan = this.user.subscriptionPlan;
    if (plan.maxOperationsPerMonth === null) return; // Безлимит

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const count = await this.prisma.operation.count({
      where: {
        userId: this.user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    if (count >= plan.maxOperationsPerMonth) {
      throw new ForbiddenException(
        `Monthly operation limit reached. Maximum ${plan.maxOperationsPerMonth} operations per month allowed.`,
      );
    }
  }

  /**
   * Проверяет оба лимита операций (общий и месячный)
   */
  async checkAllOperationsLimits(): Promise<void> {
    await this.checkOperationsPerMonthLimit();
  }

  /**
   * Проверяет лимит категорий
   */
  async checkCategoriesLimit(): Promise<void> {
    const plan = this.user.subscriptionPlan;
    if (plan.maxCategories === null) return; // Безлимит

    const count = await this.prisma.category.count({
      where: { userId: this.user.id },
    });

    if (count >= plan.maxCategories) {
      throw new ForbiddenException(
        `Category limit reached. Maximum ${plan.maxCategories} categories allowed.`,
      );
    }
  }

  /**
   * Проверяет лимит счетов/бюджетов
   */
  async checkAccountsLimit(): Promise<void> {
    const plan = this.user.subscriptionPlan;
    if (plan.maxAccounts === null) return; // Безлимит

    const count = await this.prisma.account.count({
      where: { userId: this.user.id },
    });

    if (count >= plan.maxAccounts) {
      throw new ForbiddenException(
        `Account limit reached. Maximum ${plan.maxAccounts} accounts allowed.`,
      );
    }
  }

  /**
   * Проверяет лимит тегов
   */
  async checkTagsLimit(): Promise<void> {
    const plan = this.user.subscriptionPlan;
    if (plan.maxTags === null) return; // Безлимит

    const count = await this.prisma.tag.count({
      where: { userId: this.user.id },
    });

    if (count >= plan.maxTags) {
      throw new ForbiddenException(
        `Tag limit reached. Maximum ${plan.maxTags} tags allowed.`,
      );
    }
  }

  /**
   * Проверяет лимит повторяющихся операций
   */
  async checkRecurrenceConfigsLimit(): Promise<void> {
    const plan = this.user.subscriptionPlan;
    if (plan.maxRecurrenceConfigs === null) return; // Безлимит

    const count = await this.prisma.recurrenceConfig.count({
      where: { userId: this.user.id },
    });

    if (count >= plan.maxRecurrenceConfigs) {
      throw new ForbiddenException(
        `Recurring operation limit reached. Maximum ${plan.maxRecurrenceConfigs} recurring operations allowed.`,
      );
    }
  }

  /**
   * Проверяет лимит ключевых слов на категорию
   */
  async checkCategoryKeywordsLimit(categoryId: string): Promise<void> {
    const plan = this.user.subscriptionPlan;
    if (plan.maxCategoryKeywordsPerCategory === null) return; // Безлимит

    const count = await this.prisma.categoryKeyword.count({
      where: {
        categoryId,
        userId: this.user.id,
      },
    });

    if (count >= plan.maxCategoryKeywordsPerCategory) {
      throw new ForbiddenException(
        `Category keyword limit reached. Maximum ${plan.maxCategoryKeywordsPerCategory} keywords per category allowed.`,
      );
    }
  }

  /**
   * Проверяет возможность экспорта данных
   */
  checkExportDataFeature(): void {
    if (!this.user.subscriptionPlan.canExportData) {
      throw new ForbiddenException(
        'Data export is not available in your subscription plan.',
      );
    }
  }

  /**
   * Проверяет возможность использования автоматической категоризации
   */
  checkAutoCategoryFeature(): void {
    if (!this.user.subscriptionPlan.canUseAutoCategory) {
      throw new ForbiddenException(
        'Auto category is not available in your subscription plan.',
      );
    }
  }
}

/**
 * Создает экземпляр проверки лимитов для пользователя
 */
export async function createSubscriptionLimitsChecker(
  prisma: PrismaService,
  user: User,
): Promise<SubscriptionLimitsChecker> {
  const userWithPlan = await prisma.user.findUnique({
    where: { id: user.id },
    include: { subscriptionPlan: true },
  });

  if (!userWithPlan) {
    throw new Error('User not found');
  }

  return new SubscriptionLimitsChecker(prisma, userWithPlan);
}
