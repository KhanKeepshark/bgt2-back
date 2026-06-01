import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  AiUploadError,
  GeneralError,
  SubscriptionError,
} from '@back/shared/constants/errors.constants';
import type { SubscriptionPlan, User } from '@prisma/generated';
import { getMonthlyOperationsCapCreatedAtRange } from './monthly-operations-cap.util';

type UserWithPlan = User & { subscriptionPlan: SubscriptionPlan };

@Injectable()
export class LimitGateService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanCreateAccount(userId: string): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, {
      accounts: true,
    });
    const max = userWithPlan.subscriptionPlan.maxAccounts;
    if (max === null) return;

    if (userWithPlan._count.accounts >= max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanCreateCategory(userId: string): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, {
      categories: true,
    });
    const max = userWithPlan.subscriptionPlan.maxCategories;
    if (max === null) return;

    if (userWithPlan._count.categories >= max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanCreateOperations(
    userId: string,
    additionalCount = 1,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId);
    const max = userWithPlan.subscriptionPlan.maxOperationsPerMonth;
    if (max === null) return;

    const { start, end } = getMonthlyOperationsCapCreatedAtRange();
    const count = await this.prisma.operation.count({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });

    if (count + additionalCount > max) {
      throw new BadRequestException(SubscriptionError.MONTHLY_LIMIT_REACHED);
    }
  }

  async assertCanCreateTag(userId: string): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, { tags: true });
    const max = userWithPlan.subscriptionPlan.maxTags;
    if (max === null) return;

    if (userWithPlan._count.tags >= max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanCreateRecurrenceConfig(userId: string): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, {
      recurrenceConfigs: true,
    });
    const max = userWithPlan.subscriptionPlan.maxRecurrenceConfigs;
    if (max === null) return;

    if (userWithPlan._count.recurrenceConfigs >= max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanCreateCategoryKeyword(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId);
    const max = userWithPlan.subscriptionPlan.maxCategoryKeywordsPerCategory;
    if (max === null) return;

    const keywordCount = await this.prisma.categoryKeyword.count({
      where: { categoryId, userId },
    });

    if (keywordCount >= max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanExport(userId: string): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId);
    if (!userWithPlan.subscriptionPlan.canExportData) {
      throw new BadRequestException(SubscriptionError.EXPORT_NOT_AVAILABLE);
    }
  }

  async assertCanUseAutoCategory(userId: string): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId);
    if (!userWithPlan.subscriptionPlan.canUseAutoCategory) {
      throw new BadRequestException(
        SubscriptionError.AUTO_CATEGORY_NOT_AVAILABLE,
      );
    }
  }

  async canUseAutoCategory(userId: string): Promise<boolean> {
    const userWithPlan = await this.loadUserWithPlan(userId);
    return userWithPlan.subscriptionPlan.canUseAutoCategory;
  }

  async assertHasAiTokens(userId: string, required: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokensBalance: true },
    });

    const available = user?.tokensBalance ?? 0;

    if (!user || available < required) {
      throw new BadRequestException(
        JSON.stringify({
          code: AiUploadError.INSUFFICIENT_TOKENS,
          params: { required, available },
        }),
      );
    }

    return available;
  }

  private async loadUserWithPlan(
    userId: string,
    countSelect?: {
      accounts?: true;
      categories?: true;
      tags?: true;
      recurrenceConfigs?: true;
    },
  ): Promise<
    UserWithPlan & {
      _count: {
        accounts?: number;
        categories?: number;
        tags?: number;
        recurrenceConfigs?: number;
      };
    }
  > {
    const userWithPlan = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptionPlan: true,
        ...(countSelect ? { _count: { select: countSelect } } : {}),
      },
    });

    if (!userWithPlan) {
      throw new BadRequestException(GeneralError.USER_NOT_FOUND);
    }

    return userWithPlan as UserWithPlan & {
      _count: {
        accounts?: number;
        categories?: number;
        tags?: number;
        recurrenceConfigs?: number;
      };
    };
  }
}
