import { Injectable } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { SubscriptionType } from '@prisma/generated';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateTotalUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  async calculateActiveUsers(days: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return this.prisma.user.count({
      where: {
        lastLoginAt: {
          gte: date,
        },
      },
    });
  }

  async calculateUsersByPlan(): Promise<Record<string, number>> {
    const users = await this.prisma.user.groupBy({
      by: ['subscriptionPlanId'],
      _count: {
        _all: true,
      },
    });

    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        id: {
          in: users.map((u) => u.subscriptionPlanId),
        },
      },
    });

    const result: Record<string, number> = {};

    for (const userGroup of users) {
      const plan = plans.find((p) => p.id === userGroup.subscriptionPlanId);
      if (plan) {
        result[plan.type] = userGroup._count._all;
      }
    }

    return result;
  }

  async calculateTotalOperations(): Promise<number> {
    return this.prisma.operation.count();
  }

  async calculateTotalCategories(): Promise<number> {
    return this.prisma.category.count();
  }

  async calculateTotalAccounts(): Promise<number> {
    return this.prisma.account.count();
  }

  async calculateOperationsCreatedDaily(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.prisma.operation.count({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
    });
  }

  async calculateAiTokensUsedDaily(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await this.prisma.aiTokenUsage.aggregate({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
      _sum: {
        actualTokens: true,
      },
    });
    return result._sum.actualTokens || 0;
  }
}
