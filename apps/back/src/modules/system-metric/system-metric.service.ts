import { Injectable } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class SystemMetricService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  public async generateDailyMetric() {
    const [
      totalUsers,
      activeUsersDaily,
      usersByPlan,
      totalOperations,
      operationsCreatedDaily,
      totalCategories,
      totalAccounts,
      aiTokensUsedDaily,
    ] = await Promise.all([
      this.analyticsService.calculateTotalUsers(),
      this.analyticsService.calculateActiveUsers(1),
      this.analyticsService.calculateUsersByPlan(),
      this.analyticsService.calculateTotalOperations(),
      this.analyticsService.calculateOperationsCreatedDaily(),
      this.analyticsService.calculateTotalCategories(),
      this.analyticsService.calculateTotalAccounts(),
      this.analyticsService.calculateAiTokensUsedDaily(),
    ]);

    return this.prismaService.systemMetric.create({
      data: {
        totalUsers,
        activeUsersDaily,
        usersByPlan,
        totalOperations,
        operationsCreatedDaily,
        totalCategories,
        totalAccounts,
        aiTokensUsedDaily,
      },
    });
  }

  public async findAll(page: number, items: number) {
    const skip = (page - 1) * items;

    const [metrics, total] = await Promise.all([
      this.prismaService.systemMetric.findMany({
        orderBy: { date: 'desc' },
        skip,
        take: items,
      }),
      this.prismaService.systemMetric.count(),
    ]);

    return {
      items: metrics.map((metric) => ({
        ...metric,
        usersByPlan: this.mapUsersByPlan(metric.usersByPlan),
      })),
      total,
    };
  }

  private mapUsersByPlan(json: any): { planName: string; count: number }[] {
    if (!json || typeof json !== 'object') {
      return [];
    }

    return Object.entries(json).map(([planName, count]) => ({
      planName,
      count: Number(count),
    }));
  }
}
