import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  AiUploadError,
  GeneralError,
  SubscriptionError,
} from '@back/shared/constants/errors.constants';
import type { Prisma, SubscriptionPlan, User } from '@prisma/generated';
import { getMonthlyOperationsCapCreatedAtRange } from './monthly-operations-cap.util';
import { lockUserForLimits } from './user-limit-lock.util';

type UserWithPlan = User & { subscriptionPlan: SubscriptionPlan };
type LimitGateDb = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LimitGateService {
  constructor(private readonly prisma: PrismaService) {}

  async lockUserForLimits(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await lockUserForLimits(tx, userId);
  }

  async assertCanCreateAccount(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, tx, {
      accounts: true,
    });
    const max = userWithPlan.subscriptionPlan.maxAccounts;
    if (max === null) return;

    if (userWithPlan._count.accounts >= max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanCreateCategory(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.assertCanCreateCategories(userId, 1, tx);
  }

  async assertCanCreateCategories(
    userId: string,
    additionalCount = 1,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, tx, {
      categories: true,
    });
    const max = userWithPlan.subscriptionPlan.maxCategories;
    if (max === null) return;

    const currentCount = userWithPlan._count.categories ?? 0;
    if (currentCount + additionalCount > max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanCreateOperations(
    userId: string,
    additionalCount = 1,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, tx);
    const max = userWithPlan.subscriptionPlan.maxOperationsPerMonth;
    if (max === null) return;

    const { start, end } = getMonthlyOperationsCapCreatedAtRange();
    const client = this.getClient(tx);
    const count = await client.operation.count({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });

    if (count + additionalCount > max) {
      throw new BadRequestException(SubscriptionError.MONTHLY_LIMIT_REACHED);
    }
  }

  async assertCanCreateTag(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, tx, {
      tags: true,
    });
    const max = userWithPlan.subscriptionPlan.maxTags;
    if (max === null) return;

    if (userWithPlan._count.tags >= max) {
      throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
    }
  }

  async assertCanCreateRecurrenceConfig(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, tx, {
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
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const userWithPlan = await this.loadUserWithPlan(userId, tx);
    const max = userWithPlan.subscriptionPlan.maxCategoryKeywordsPerCategory;
    if (max === null) return;

    const client = this.getClient(tx);
    const keywordCount = await client.categoryKeyword.count({
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

  async debitAiTokens(userId: string, amount: number): Promise<number> {
    if (amount <= 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tokensBalance: true },
      });
      return user?.tokensBalance ?? 0;
    }

    const result = await this.prisma.user.updateMany({
      where: {
        id: userId,
        tokensBalance: { gte: amount },
      },
      data: {
        tokensBalance: { decrement: amount },
      },
    });

    if (result.count === 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tokensBalance: true },
      });
      const available = user?.tokensBalance ?? 0;

      throw new BadRequestException(
        JSON.stringify({
          code: AiUploadError.INSUFFICIENT_TOKENS,
          params: { required: amount, available },
        }),
      );
    }

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tokensBalance: true },
    });

    return updated?.tokensBalance ?? 0;
  }

  private getClient(tx?: Prisma.TransactionClient): LimitGateDb {
    return tx ?? this.prisma;
  }

  private async loadUserWithPlan(
    userId: string,
    tx?: Prisma.TransactionClient,
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
    const client = this.getClient(tx);
    const userWithPlan = await client.user.findUnique({
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
