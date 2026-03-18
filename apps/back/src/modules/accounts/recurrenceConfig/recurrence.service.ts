import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Operation,
  OperationType,
  User,
  RecurrenceConfig,
} from '@prisma/generated';
import { Decimal } from '@prisma/client/runtime/library';
import { RecurrenceConfigInput } from './inputs/recurrence-config.input';
import { CreateOperationInput } from '../operation/inputs/create-operation.input';
import { AccountError, CategoryError, RecurrenceError, SubscriptionError, TagError } from '@back/shared/constants/errors.constants';

@Injectable()
export class RecurrenceService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async createRecurringOperation(
    input: CreateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      // Проверка лимитов плана
      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: user.id },
        include: { subscriptionPlan: true, _count: { select: { recurrenceConfigs: true } } },
      });

      if (userWithPlan?.subscriptionPlan) {
        if (
          userWithPlan.subscriptionPlan.maxRecurrenceConfigs !== null &&
          userWithPlan._count.recurrenceConfigs >= userWithPlan.subscriptionPlan.maxRecurrenceConfigs
        ) {
          throw new BadRequestException(SubscriptionError.LIMIT_REACHED);
        }
      }

      const account = await this.prismaService.account.findFirst({
        where: { id: input.accountId, userId: user.id },
      });

      if (!account) {
        throw new BadRequestException(AccountError.NOT_FOUND);
      }

      if (input.type !== OperationType.TRANSFER) {
        const category = await this.prismaService.category.findFirst({
          where: { id: input.categoryId, userId: user.id },
        });

      if (!category) {
        throw new BadRequestException(CategoryError.NOT_FOUND);
      }
      }

      if (input.type === OperationType.TRANSFER) {
        const transferAccount = await this.prismaService.account.findFirst({
          where: { id: input.transferAccountId, userId: user.id },
        });

        if (!transferAccount) {
          throw new BadRequestException(
            AccountError.NOT_FOUND,
          );
        }
      }

      if (input.tags && input.tags.length > 0) {
        const tags = await this.prismaService.tag.findMany({
          where: {
            id: { in: input.tags },
            userId: user.id,
          },
        });

        if (tags.length !== input.tags.length) {
          throw new BadRequestException(TagError.NOT_FOUND);
        }
      }

      const result = await this.prismaService.$transaction(async (tx) => {
        // Вычисляем следующую дату для RecurrenceConfig,
        // так как первая операция создается сразу
        const nextDate = this.calculateNextDate(
          input.date,
          input.recurrence.frequency,
          input.recurrence.interval,
          input.recurrence.weekDays,
        );

        const recurrenceConfig = await tx.recurrenceConfig.create({
          data: {
            frequency: input.recurrence.frequency,
            interval: input.recurrence.interval,
            weekDays: input.recurrence.weekDays || [],
            date: nextDate,
            amount: input.amount,
            description: input.description,
            type: input.type,
            user: {
              connect: { id: user.id },
            },
            account: {
              connect: { id: input.accountId },
            },
            category: input.categoryId
              ? {
                  connect: { id: input.categoryId },
                }
              : undefined,
            transferAccount: input.transferAccountId
              ? {
                  connect: { id: input.transferAccountId },
                }
              : undefined,
          },
        });

        const firstOperation = await tx.operation.create({
          data: {
            amount: input.amount,
            date: input.date,
            description: input.description,
            type: input.type,
            user: {
              connect: { id: user.id },
            },
            account: {
              connect: { id: input.accountId },
            },
            category: input.categoryId
              ? {
                  connect: { id: input.categoryId },
                }
              : undefined,
            transferAccount: input.transferAccountId
              ? {
                  connect: { id: input.transferAccountId },
                }
              : undefined,
            tags: input.tags
              ? {
                  connect: input.tags.map((id) => ({ id })),
                }
              : undefined,
            recurrenceConfig: {
              connect: { id: recurrenceConfig.id },
            },
          },
          include: {
            category: true,
            account: true,
            tags: true,
            transferAccount: true,
            recurrenceConfig: true,
          },
        });

        const amount = new Decimal(input.amount);

        if (input.type === OperationType.TRANSFER && input.transferAccountId) {
          await tx.account.update({
            where: { id: input.accountId },
            data: {
              balance: {
                decrement: amount,
              },
            },
          });

          await tx.account.update({
            where: { id: input.transferAccountId },
            data: {
              balance: {
                increment: amount,
              },
            },
          });
        } else {
          const balanceUpdate =
            input.type === OperationType.INCOME
              ? { increment: amount }
              : { decrement: amount };

          await tx.account.update({
            where: { id: input.accountId },
            data: {
              balance: balanceUpdate,
            },
          });
        }

        return firstOperation;
      });

      return result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(RecurrenceError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async findAllRecurrences(user: User): Promise<RecurrenceConfig[]> {
    try {
      const recurrences = await this.prismaService.recurrenceConfig.findMany({
        where: {
          userId: user.id,
        },
        include: {
          account: true,
          category: true,
          transferAccount: true,
          operations: {
            orderBy: { date: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return recurrences;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(RecurrenceError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async findOneRecurrence(
    id: string,
    user: User,
  ): Promise<RecurrenceConfig> {
    try {
      const recurrence = await this.prismaService.recurrenceConfig.findFirst({
        where: {
          id,
          userId: user.id,
        },
        include: {
          account: true,
          category: true,
          transferAccount: true,
          operations: {
            orderBy: { date: 'desc' },
          },
        },
      });

      if (!recurrence) {
        throw new NotFoundException(RecurrenceError.NOT_FOUND);
      }

      return recurrence;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(RecurrenceError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async updateRecurrence(
    id: string,
    input: {
      recurrence?: RecurrenceConfigInput;
      amount?: string;
      description?: string;
      categoryId?: string;
      accountId?: string;
      transferAccountId?: string;
    },
    user: User,
  ): Promise<RecurrenceConfig> {
    try {
      await this.findOneRecurrence(id, user);

      if (input.accountId) {
        const account = await this.prismaService.account.findFirst({
          where: { id: input.accountId, userId: user.id },
        });

        if (!account) {
          throw new BadRequestException('Account not found or access denied');
        }
      }

      if (input.categoryId) {
        const category = await this.prismaService.category.findFirst({
          where: { id: input.categoryId, userId: user.id },
        });

      if (!category) {
        throw new BadRequestException(CategoryError.NOT_FOUND);
      }
      }

      if (input.transferAccountId) {
        const transferAccount = await this.prismaService.account.findFirst({
          where: { id: input.transferAccountId, userId: user.id },
        });

        if (!transferAccount) {
          throw new BadRequestException(
            AccountError.NOT_FOUND,
          );
        }
      }

      const updated = await this.prismaService.recurrenceConfig.update({
        where: { id },
        data: {
          frequency: input.recurrence?.frequency,
          interval: input.recurrence?.interval,
          weekDays: input.recurrence?.weekDays,
          amount: input.amount,
          description: input.description,
          account: input.accountId
            ? {
                connect: { id: input.accountId },
              }
            : undefined,
          category: input.categoryId
            ? {
                connect: { id: input.categoryId },
              }
            : undefined,
          transferAccount: input.transferAccountId
            ? {
                connect: { id: input.transferAccountId },
              }
            : undefined,
        },
        include: {
          account: true,
          category: true,
          transferAccount: true,
          operations: {
            orderBy: { date: 'desc' },
            take: 5,
          },
        },
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(RecurrenceError.UPDATE_FAILED);
      }

      throw error;
    }
  }

  public async deleteRecurrence(id: string, user: User): Promise<boolean> {
    try {
      await this.findOneRecurrence(id, user);

      const result = await this.prismaService.recurrenceConfig.delete({
        where: { id },
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(RecurrenceError.DELETION_FAILED);
      }

      throw error;
    }
  }

  public async createNextRecurringOperation(
    recurrenceId: string,
  ): Promise<Operation> {
    try {
      const recurrence = await this.prismaService.recurrenceConfig.findUnique({
        where: { id: recurrenceId },
      });

      if (!recurrence) {
        throw new NotFoundException(RecurrenceError.NOT_FOUND);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recurrenceDate = new Date(recurrence.date);
      recurrenceDate.setHours(0, 0, 0, 0);

      if (recurrenceDate > today) {
        throw new BadRequestException('Recurrence date has not arrived yet');
      }

      // Проверка лимитов плана на операции
      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: recurrence.userId },
        include: { subscriptionPlan: true, _count: { select: { operations: true } } },
      });

      if (userWithPlan?.subscriptionPlan) {
        // Лимит операций в месяц
        if (userWithPlan.subscriptionPlan.maxOperationsPerMonth !== null) {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const operationsThisMonth = await this.prismaService.operation.count({
            where: {
              userId: recurrence.userId,
              createdAt: { gte: startOfMonth },
            },
          });

          if (operationsThisMonth >= userWithPlan.subscriptionPlan.maxOperationsPerMonth) {
            throw new BadRequestException(SubscriptionError.MONTHLY_LIMIT_REACHED);
          }
        }
      }

      const nextDate = this.calculateNextDate(
        recurrence.date,
        recurrence.frequency,
        recurrence.interval,
        recurrence.weekDays,
      );

      const result = await this.prismaService.$transaction(async (tx) => {
        const operation = await tx.operation.create({
          data: {
            amount: recurrence.amount,
            date: recurrence.date,
            description: recurrence.description,
            type: recurrence.type,
            user: {
              connect: { id: recurrence.userId },
            },
            account: recurrence.accountId
              ? {
                  connect: { id: recurrence.accountId },
                }
              : undefined,
            category: recurrence.categoryId
              ? {
                  connect: { id: recurrence.categoryId },
                }
              : undefined,
            transferAccount: recurrence.transferAccountId
              ? {
                  connect: { id: recurrence.transferAccountId },
                }
              : undefined,
            recurrenceConfig: {
              connect: { id: recurrenceId },
            },
          },
          include: {
            category: true,
            account: true,
            transferAccount: true,
            recurrenceConfig: true,
          },
        });

        const amount = new Decimal(recurrence.amount);

        if (recurrence.type === OperationType.TRANSFER && recurrence.transferAccountId) {
          if (recurrence.accountId) {
            await tx.account.update({
              where: { id: recurrence.accountId },
              data: {
                balance: {
                  decrement: amount,
                },
              },
            });
          }

          await tx.account.update({
            where: { id: recurrence.transferAccountId },
            data: {
              balance: {
                increment: amount,
              },
            },
          });
        } else if (recurrence.accountId) {
          const balanceUpdate =
            recurrence.type === OperationType.INCOME
              ? { increment: amount }
              : { decrement: amount };

          await tx.account.update({
            where: { id: recurrence.accountId },
            data: {
              balance: balanceUpdate,
            },
          });
        }

        await tx.recurrenceConfig.update({
          where: { id: recurrenceId },
          data: {
            date: nextDate,
          },
        });

        return operation;
      });

      return result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(
          'Failed to create recurring operation instance',
        );
      }

      throw error;
    }
  }

  /**
   * Обработать все активные повторения
   * Этот метод вызывается cron'ом каждый день
   */
  public async processRecurringOperations(): Promise<{
    processed: number;
    created: number;
    errors: number;
  }> {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const stats = {
      processed: 0,
      created: 0,
      errors: 0,
    };

    try {
      const recurrences = await this.prismaService.recurrenceConfig.findMany({
        where: {
          date: {
            lte: endOfToday,
          },
        },
      });

      stats.processed = recurrences.length;

      for (const recurrence of recurrences) {
        try {
          await this.createNextRecurringOperation(recurrence.id);
          stats.created++;
        } catch (error) {
          console.error(
            `Failed to create operation for recurrence ${recurrence.id}:`,
            error,
          );
          stats.errors++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to process recurring operations:', error);
      throw error;
    }
  }

  private calculateNextDate(
    currentDate: Date,
    frequency: string,
    interval: number,
    weekDays?: number[],
  ): Date {
    const date = new Date(currentDate);

    switch (frequency) {
      case 'DAILY':
        date.setDate(date.getDate() + interval);
        break;

      case 'WEEKLY':
        if (weekDays && weekDays.length > 0) {
          const currentDay = date.getDay();
          const sortedWeekDays = [...weekDays].sort((a, b) => a - b);

          let nextDay = sortedWeekDays.find((day) => day > currentDay);

          if (nextDay === undefined) {
            nextDay = sortedWeekDays[0];
            const daysToAdd = 7 - currentDay + nextDay + (interval - 1) * 7;
            date.setDate(date.getDate() + daysToAdd);
          } else {
            date.setDate(date.getDate() + (nextDay - currentDay));
          }
        }
        break;

      case 'MONTHLY':
        date.setMonth(date.getMonth() + interval);
        break;

      case 'YEARLY':
        date.setFullYear(date.getFullYear() + interval);
        break;

      default:
        throw new BadRequestException(`Unknown frequency: ${frequency}`);
    }

    return date;
  }
}
