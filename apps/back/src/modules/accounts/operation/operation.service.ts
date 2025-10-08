import { PrismaService } from '@back/src/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOperationInput } from './inputs/create-operation.input';
import { Decimal } from '@prisma/client/runtime/library';
import {
  Operation,
  OperationType,
  User,
  RecurrenceConfig,
} from '@prisma/generated';
import { UpdateOperationInput } from './inputs/update-operation.input';
import { RecurrenceConfigInput } from './inputs/recurrence-config.input';

@Injectable()
export class OperationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(
    input: CreateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      // Если есть настройки повторения, создаём RecurrenceConfig вместо обычной операции
      if (input.recurrence) {
        return await this.createRecurringOperation(input, user);
      }

      const account = await this.prismaService.account.findFirst({
        where: { id: input.accountId, userId: user.id },
      });

      if (!account) {
        throw new BadRequestException('Account not found or access denied');
      }

      if (input.tags && input.tags.length > 0) {
        const tags = await this.prismaService.tag.findMany({
          where: {
            id: { in: input.tags },
            userId: user.id,
          },
        });

        if (tags.length !== input.tags.length) {
          throw new BadRequestException('Some tags not found or access denied');
        }
      }

      if (input.type === OperationType.TRANSFER) {
        const transferAccount = await this.prismaService.account.findFirst({
          where: { id: input.transferAccountId, userId: user.id },
        });

        if (!transferAccount) {
          throw new BadRequestException(
            'Transfer account not found or access denied',
          );
        }

        const createTransferOperation =
          await this.prismaService.operation.create({
            data: {
              amount: input.amount,
              date: input.date,
              description: input.description,
              type: OperationType.TRANSFER,
              user: {
                connect: { id: user.id },
              },
              transferAccount: {
                connect: { id: input.transferAccountId },
              },
              tags: input.tags
                ? {
                    connect: input.tags.map((id) => ({ id })),
                  }
                : undefined,
              account: {
                connect: { id: input.accountId },
              },
            },
          });

        return createTransferOperation;
      }

      const category = await this.prismaService.category.findFirst({
        where: { id: input.categoryId, userId: user.id },
      });

      if (!category) {
        throw new BadRequestException('Category not found or access denied');
      }

      const created = await this.prismaService.operation.create({
        data: {
          amount: input.amount,
          date: input.date,
          description: input.description,
          type: input.type,
          category: {
            connect: { id: input.categoryId },
          },
          account: {
            connect: { id: input.accountId },
          },
          user: {
            connect: { id: user.id },
          },
          tags: input.tags
            ? {
                connect: input.tags.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to create operation');
      }

      throw error;
    }
  }

  private async createRecurringOperation(
    input: CreateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      const account = await this.prismaService.account.findFirst({
        where: { id: input.accountId, userId: user.id },
      });

      if (!account) {
        throw new BadRequestException('Account not found or access denied');
      }

      if (input.type !== OperationType.TRANSFER) {
        const category = await this.prismaService.category.findFirst({
          where: { id: input.categoryId, userId: user.id },
        });

        if (!category) {
          throw new BadRequestException('Category not found or access denied');
        }
      }

      if (input.type === OperationType.TRANSFER) {
        const transferAccount = await this.prismaService.account.findFirst({
          where: { id: input.transferAccountId, userId: user.id },
        });

        if (!transferAccount) {
          throw new BadRequestException(
            'Transfer account not found or access denied',
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
          throw new BadRequestException('Some tags not found or access denied');
        }
      }

      const result = await this.prismaService.$transaction(async (tx) => {
        const recurrenceConfig = await tx.recurrenceConfig.create({
          data: {
            frequency: input.recurrence.frequency,
            interval: input.recurrence.interval,
            weekDays: input.recurrence.weekDays || [],
            date: input.date,
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

        return firstOperation;
      });

      return result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to create recurring operation');
      }

      throw error;
    }
  }

  public async findAll(user: User): Promise<Operation[]> {
    try {
      const operations = await this.prismaService.operation.findMany({
        where: {
          account: { userId: user.id },
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
        orderBy: { date: 'desc' },
      });

      return operations;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find operations');
      }

      throw error;
    }
  }

  public async findAllSortedByDays(user: User): Promise<
    {
      day: string;
      allIncome: Decimal;
      allExpense: Decimal;
      operations: Operation[];
    }[]
  > {
    try {
      const operations = await this.prismaService.operation.findMany({
        where: {
          user: { id: user.id },
        },
        include: {
          category: true,
          account: true,
          tags: true,
          transferAccount: true,
        },
        orderBy: { date: 'desc' },
      });

      const groupedByDay = new Map<string, Operation[]>();

      for (const operation of operations) {
        const day = operation.date.toISOString().split('T')[0];
        const listForDay = groupedByDay.get(day) ?? [];
        listForDay.push(operation);
        groupedByDay.set(day, listForDay);
      }

      const groups = Array.from(groupedByDay.entries()).map(([day, ops]) => {
        const allIncome = ops.reduce(
          (sum, op) =>
            op.type === OperationType.INCOME ? sum.add(op.amount) : sum,
          new Decimal(0),
        );

        const allExpense = ops.reduce(
          (sum, op) =>
            op.type === OperationType.EXPENSE ? sum.add(op.amount) : sum,
          new Decimal(0),
        );

        return {
          day,
          allIncome,
          allExpense,
          operations: ops,
        };
      });

      groups.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));

      return groups;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find operations');
      }

      throw error;
    }
  }

  public async findOne(id: string, user: User): Promise<Operation> {
    try {
      const operation = await this.prismaService.operation.findFirst({
        where: {
          id,
          account: { userId: user.id },
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
      });

      if (!operation) {
        throw new NotFoundException('Operation not found');
      }

      return operation;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find operation');
      }

      throw error;
    }
  }

  public async update(
    input: UpdateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      await this.findOne(input.id, user);

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
          throw new BadRequestException('Category not found or access denied');
        }
      }

      if (input.tags) {
        const tags = await this.prismaService.tag.findMany({
          where: {
            id: { in: input.tags },
            userId: user.id,
          },
        });

        if (tags.length !== input.tags.length) {
          throw new BadRequestException('Some tags not found or access denied');
        }
      }

      const updated = await this.prismaService.operation.update({
        where: { id: input.id },
        data: {
          amount: input.amount,
          date: input.date,
          description: input.description,
          type: input.type,
          category: input.categoryId
            ? {
                connect: { id: input.categoryId },
              }
            : undefined,
          account: input.accountId
            ? {
                connect: { id: input.accountId },
              }
            : undefined,
          tags: input.tags
            ? {
                set: input.tags.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to update operation');
      }

      throw error;
    }
  }

  public async delete(id: string, user: User): Promise<boolean> {
    try {
      await this.findOne(id, user);

      const result = await this.prismaService.operation.delete({
        where: { id },
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to delete operation');
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
        throw new BadRequestException('Failed to find recurrences');
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
        throw new NotFoundException('Recurrence not found');
      }

      return recurrence;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find recurrence');
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
          throw new BadRequestException('Category not found or access denied');
        }
      }

      if (input.transferAccountId) {
        const transferAccount = await this.prismaService.account.findFirst({
          where: { id: input.transferAccountId, userId: user.id },
        });

        if (!transferAccount) {
          throw new BadRequestException(
            'Transfer account not found or access denied',
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
        throw new BadRequestException('Failed to update recurrence');
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
        throw new BadRequestException('Failed to delete recurrence');
      }

      throw error;
    }
  }

  /**
   * Создать следующую операцию из шаблона повторения
   * Вызывается ТОЛЬКО если date <= сегодня
   */
  public async createNextRecurringOperation(
    recurrenceId: string,
  ): Promise<Operation> {
    try {
      const recurrence = await this.prismaService.recurrenceConfig.findUnique({
        where: { id: recurrenceId },
      });

      if (!recurrence) {
        throw new NotFoundException('Recurrence not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recurrenceDate = new Date(recurrence.date);
      recurrenceDate.setHours(0, 0, 0, 0);

      // Проверка: создаём операцию только если дата наступила
      if (recurrenceDate > today) {
        throw new BadRequestException('Recurrence date has not arrived yet');
      }

      // Вычисляем следующую дату после текущей date
      const nextDate = this.calculateNextDate(
        recurrence.date,
        recurrence.frequency,
        recurrence.interval,
        recurrence.weekDays,
      );

      // Создаём операцию и обновляем RecurrenceConfig в транзакции
      const result = await this.prismaService.$transaction(async (tx) => {
        // Создаём операцию с текущей датой из recurrence
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

        // Обновляем date на следующую дату повторения
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      processed: 0,
      created: 0,
      errors: 0,
    };

    try {
      // Найти все RecurrenceConfig, у которых date <= сегодня
      const recurrences = await this.prismaService.recurrenceConfig.findMany({
        where: {
          date: {
            lte: today,
          },
        },
      });

      stats.processed = recurrences.length;

      // Обработать каждое повторение
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

  /**
   * Вычислить следующую дату повторения
   */
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
          // Для WEEKLY с конкретными днями недели
          const currentDay = date.getDay();
          const sortedWeekDays = [...weekDays].sort((a, b) => a - b);

          // Найти следующий день недели
          let nextDay = sortedWeekDays.find((day) => day > currentDay);

          if (nextDay === undefined) {
            // Если нет дня позже в текущей неделе, берём первый день из следующей недели
            nextDay = sortedWeekDays[0];
            const daysToAdd = 7 - currentDay + nextDay + (interval - 1) * 7;
            date.setDate(date.getDate() + daysToAdd);
          } else {
            // Есть день позже в текущей неделе
            date.setDate(date.getDate() + (nextDay - currentDay));
          }
        } else {
          // Обычный недельный интервал
          date.setDate(date.getDate() + interval * 7);
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
