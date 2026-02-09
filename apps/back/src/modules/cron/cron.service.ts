import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurrenceService } from '../accounts/recurrenceConfig/recurrence.service';
import { PrismaService } from '@back/core/prisma/prisma.service';

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

      const defaultPlan = await this.prismaService.subscriptionPlan.findFirst({
        where: { isDefaultOnExpiration: true },
      });

      if (!defaultPlan) {
        this.logger.error('Default subscription plan not found! Cannot downgrade users.');
        return;
      }

      this.logger.log(`Found ${expiredUsers.length} users with expired subscriptions. Downgrading to ${defaultPlan.name}...`);

      const result = await this.prismaService.user.updateMany({
        where: {
          subscriptionExpiresAt: {
            lt: new Date(),
          },
        },
        data: {
          subscriptionPlanId: defaultPlan.id,
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
      const usersToUpdate = await this.prismaService.$queryRaw`
        SELECT u.id, u."subscriptionPlanId", sp."tokensPerMonth"
        FROM "User" u
        JOIN "SubscriptionPlan" sp ON u."subscriptionPlanId" = sp.id
        WHERE EXTRACT(DAY FROM u."subscriptionStartedAt") = ${currentDay}
        AND sp."tokensPerMonth" IS NOT NULL
      ` as Array<{ id: string, subscriptionPlanId: string, tokensPerMonth: number }>;

      this.logger.log(`Found ${usersToUpdate.length} users for token replenishment.`);

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
      this.logger.log(`Deleted ${deletedTokens.count} expired verification tokens.`);

      // 2. Удаляем старые уведомления (старше 3 месяцев)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const deletedNotifications = await this.prismaService.notification.deleteMany({
        where: {
          createdAt: {
            lt: threeMonthsAgo,
          },
          isRead: true, // Удаляем только прочитанные
        },
      });
      this.logger.log(`Deleted ${deletedNotifications.count} old read notifications.`);

    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }
}
