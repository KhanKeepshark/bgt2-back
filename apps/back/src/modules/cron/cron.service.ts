import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurrenceService } from '../accounts/recurrenceConfig/recurrence.service';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { SubscriptionType } from '@prisma/generated';
import { exec } from 'child_process';
import { promisify } from 'util';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  public constructor(
    private readonly recurrenceService: RecurrenceService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Обработка повторяющихся операций каждый день в 00:01
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringOperations() {
    this.logger.log('Starting recurring operations processing...');

    try {
      const stats = await this.recurrenceService.processRecurringOperations();

      this.logger.log(
        `Recurring operations processed: ${stats.processed} total, ${stats.created} created, ${stats.errors} errors`,
      );
    } catch (error) {
      this.logger.error('Failed to process recurring operations:', error);
    }
  }

  /**
   * Проверка истекших подписок каждый день в 01:00
   */
  @Cron('0 1 * * *')
  async handleSubscriptionExpiration() {
    this.logger.log('Checking for expired subscriptions...');

    try {
      const expiredUsers = await this.prismaService.user.findMany({
        where: {
          subscriptionExpiresAt: {
            lt: new Date(),
          },
        },
      });

      if (expiredUsers.length === 0) {
        this.logger.log('No expired subscriptions found.');
        return;
      }

      const defaultPlan = await this.prismaService.subscriptionPlan.findUnique({
        where: { type: SubscriptionType.FREE },
      });

      if (!defaultPlan) {
        this.logger.error(
          'Default subscription plan not found! Cannot downgrade users.',
        );
        return;
      }

      this.logger.log(
        `Found ${expiredUsers.length} users with expired subscriptions. Downgrading to ${defaultPlan.type}...`,
      );

      const result = await this.prismaService.user.updateMany({
        where: {
          subscriptionExpiresAt: {
            lt: new Date(),
          },
        },
        data: {
          subscriptionPlanId: defaultPlan.id,
          subscriptionPriceId: null, // Reset price selection
          subscriptionExpiresAt: null, // Бессрочный (или логика плана)
          tokensBalance: defaultPlan.tokensOnPurchase, // Сбрасываем токены до лимита бесплатного плана
        },
      });

      this.logger.log(`Downgraded ${result.count} users.`);
    } catch (error) {
      this.logger.error('Failed to process subscription expirations:', error);
    }
  }

  /**
   * Ежемесячное начисление токенов
   * Запускается каждый день в 02:00
   */
  @Cron('0 2 * * *')
  async handleMonthlyTokenReplenishment() {
    this.logger.log('Replenishing monthly tokens...');

    try {
      // Находим пользователей, у которых сегодня "день рождения" подписки
      // Это упрощенная логика: проверяем, совпадает ли день месяца
      const today = new Date();
      const currentDay = today.getDate();

      // Получаем всех пользователей (для продакшена лучше чанками, но для MVP ок)
      // В Prisma нет простого способа выбрать "WHERE DAY(subscriptionStartedAt) = X",
      // поэтому выберем активных пользователей и отфильтруем в коде или используем raw query

      // Используем raw query для производительности
      const usersToUpdate = (await this.prismaService.$queryRaw`
        SELECT u.id, u."subscriptionPlanId", sp."tokensPerMonth"
        FROM "User" u
        JOIN "SubscriptionPlan" sp ON u."subscriptionPlanId" = sp.id
        WHERE EXTRACT(DAY FROM u."subscriptionStartedAt") = ${currentDay}
        AND sp."tokensPerMonth" IS NOT NULL
      `) as Array<{
        id: string;
        subscriptionPlanId: string;
        tokensPerMonth: number;
      }>;

      this.logger.log(
        `Found ${usersToUpdate.length} users for token replenishment.`,
      );

      for (const user of usersToUpdate) {
        await this.prismaService.user.update({
          where: { id: user.id },
          data: {
            tokensBalance: user.tokensPerMonth, // Сбрасываем баланс на месячный лимит
          },
        });
      }

      this.logger.log(`Replenished tokens for ${usersToUpdate.length} users.`);
    } catch (error) {
      this.logger.error('Failed to replenish tokens:', error);
    }
  }

  /**
   * Очистка старых данных каждое воскресенье в 03:00
   */
  @Cron(CronExpression.EVERY_WEEK)
  async handleCleanup() {
    this.logger.log('Starting cleanup...');

    try {
      // 1. Удаляем просроченные токены верификации
      const deletedTokens = await this.prismaService.token.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      this.logger.log(
        `Deleted ${deletedTokens.count} expired verification tokens.`,
      );

      // 2. Удаляем старые уведомления (старше 3 месяцев)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const deletedNotifications =
        await this.prismaService.notification.deleteMany({
          where: {
            createdAt: {
              lt: threeMonthsAgo,
            },
            isRead: true, // Удаляем только прочитанные
          },
        });
      this.logger.log(
        `Deleted ${deletedNotifications.count} old read notifications.`,
      );
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }

  /**
   * Создание бэкапа базы данных каждый день в 03:00
   */
  @Cron('0 3 * * *')
  async handleDatabaseBackup() {
    this.logger.log('Starting database backup...');

    try {
      const execPromise = promisify(exec);

      const dbUser = process.env.POSTGRES_USER;
      const dbName = process.env.POSTGRES_DB;
      const dbHost = process.env.POSTGRES_HOST;
      const dbPassword = process.env.POSTGRES_PASSWORD;

      const date = new Date().toISOString().replace(/[:.]/g, '-');
      // Поскольку бэкенд запущен в докере и у нас проброшен volume ./backups:/app/backups
      // мы можем сохранять бэкап прямо в папку /app/backups внутри контейнера
      const backupFile = `/app/backups/db_backup_${date}.sql`;

      // Создаем папку, если ее нет
      await execPromise('mkdir -p /app/backups');

      // Выполняем pg_dump
      // PGPASSWORD передается через переменную окружения для безопасности
      await execPromise(
        `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -U ${dbUser} -d ${dbName} -F c -f ${backupFile}`,
      );

      this.logger.log(`Database backup created successfully: ${backupFile}`);

      // Удаляем старые бэкапы (старше 7 дней)
      await execPromise(
        'find /app/backups -type f -name "*.sql" -mtime +7 -delete',
      );
      this.logger.log('Old backups cleaned up.');
    } catch (error) {
      this.logger.error('Failed to create database backup:', error);
    }
  }
  /**
   * Сбор системной аналитики каждый день в 23:55
   */
  @Cron('55 23 * * *')
  async handleSystemAnalytics() {
    this.logger.log('Collecting system analytics...');

    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsersDaily,
        totalOperations,
        operationsCreatedDaily,
        aiTokensUsedDailyRaw,
        usersByPlanRaw,
      ] = await Promise.all([
        this.prismaService.user.count(),
        this.prismaService.user.count({
          where: { lastLoginAt: { gte: oneDayAgo } },
        }),
        this.prismaService.operation.count(),
        this.prismaService.operation.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        this.prismaService.aiTokenUsage.aggregate({
          where: { createdAt: { gte: oneDayAgo } },
          _sum: { actualTokens: true },
        }),
        this.prismaService.user.groupBy({
          by: ['subscriptionPlanId'],
          _count: { id: true },
        }),
      ]);

      // Enrich plan data with names
      const plans = await this.prismaService.subscriptionPlan.findMany();
      const planMap = new Map(plans.map((p) => [p.id, p.type]));

      const usersByPlan: Record<string, number> = {};
      usersByPlanRaw.forEach((item) => {
        const planName = planMap.get(item.subscriptionPlanId) || 'Unknown';
        usersByPlan[planName] = item._count.id;
      });

      await this.prismaService.systemMetric.create({
        data: {
          totalUsers,
          activeUsersDaily,
          usersByPlan: usersByPlan as any,
          totalOperations,
          operationsCreatedDaily,
          aiTokensUsedDaily: aiTokensUsedDailyRaw._sum.actualTokens || 0,
        },
      });

      this.logger.log('System analytics collected successfully.');
    } catch (error) {
      this.logger.error('Failed to collect system analytics:', error);
    }
  }
}
