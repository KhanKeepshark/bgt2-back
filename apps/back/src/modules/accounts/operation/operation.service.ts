import { PrismaService } from '@back/core/prisma/prisma.service';
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
  Category,
  CategoryType,
  Account,
} from '@prisma/generated';
import { UpdateOperationInput } from './inputs/update-operation.input';
import { ExtractedOperationInput } from './inputs/extracted-operation.input';
import { OperationFilterInput } from './inputs/operation-filter.input';
import { RecurrenceService } from '../recurrenceConfig/recurrence.service';
import { OperationChartsFilterInput } from './inputs/operation-charts-filter';
import { Prisma } from '@prisma/generated';
import { calculateGroupSize, groupDays } from './utils/findAllForCharts.utils';
import { Categories } from './models/operation-chart-data.model';
import { AccountError, CategoryError, OperationError, RecurrenceError, SubscriptionError, TagError } from '@back/shared/constants/errors.constants';

@Injectable()
export class OperationService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly recurrenceService: RecurrenceService,
  ) {}

  public async create(
    input: CreateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      // Проверка лимитов плана
      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: user.id },
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
              userId: user.id,
              createdAt: { gte: startOfMonth },
            },
          });

          if (operationsThisMonth >= userWithPlan.subscriptionPlan.maxOperationsPerMonth) {
            throw new BadRequestException(SubscriptionError.MONTHLY_LIMIT_REACHED);
          }
        }
      }

      if (input.recurrence) {
        return await this.recurrenceService.createRecurringOperation(
          input,
          user,
        );
      }

      const account = await this.prismaService.account.findFirst({
        where: { id: input.accountId, userId: user.id },
      });

      if (!account) {
        throw new BadRequestException(AccountError.NOT_FOUND);
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

      if (input.type === OperationType.TRANSFER) {
        const transferAccount = await this.prismaService.account.findFirst({
          where: { id: input.transferAccountId, userId: user.id },
        });

        if (!transferAccount) {
          throw new BadRequestException(
            AccountError.NOT_FOUND,
          );
        }

        if (input.accountId === input.transferAccountId) {
          throw new BadRequestException(OperationError.TRANSFER_SAME_ACCOUNT);
        }

        const amount = new Decimal(input.amount);

        const createTransferOperation = await this.prismaService.$transaction(
          async (tx) => {
            const operation = await tx.operation.create({
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
              include: {
                account: true,
                transferAccount: true,
                tags: true,
              },
            });

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

            return operation;
          },
        );

        return createTransferOperation;
      }

      const category = await this.prismaService.category.findFirst({
        where: { id: input.categoryId, userId: user.id },
      });

      if (!category) {
        throw new BadRequestException(CategoryError.NOT_FOUND);
      }

      const amount = new Decimal(input.amount);
      const balanceUpdate =
        input.type === OperationType.INCOME
          ? { increment: amount }
          : { decrement: amount };

      const created = await this.prismaService.$transaction(async (tx) => {
        const operation = await tx.operation.create({
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

        await tx.account.update({
          where: { id: input.accountId },
          data: {
            balance: balanceUpdate,
          },
        });

        return operation;
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async createExtracted(
    accountId: string,
    operations: ExtractedOperationInput[],
    user: User,
  ): Promise<Operation[]> {
    try {
      // Проверка лимитов плана
      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: user.id },
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
              userId: user.id,
              createdAt: { gte: startOfMonth },
            },
          });

          if (operationsThisMonth + operations.length > userWithPlan.subscriptionPlan.maxOperationsPerMonth) {
            throw new BadRequestException(SubscriptionError.MONTHLY_LIMIT_REACHED);
          }
        }
      }

      const account = await this.prismaService.account.findFirst({
        where: { id: accountId, userId: user.id },
      });

      if (!account) {
        throw new BadRequestException(AccountError.NOT_FOUND);
      }

      const [categories, accounts] = await Promise.all([
        this.prismaService.category.findMany({
          where: { userId: user.id },
        }),
        this.prismaService.account.findMany({
          where: { userId: user.id },
        }),
      ]);

      const categoryMap = new Map<string, Category>();
      categories.forEach((c) => categoryMap.set(c.name.toLowerCase(), c));
      const accountMap = new Map<string, Account>();
      accounts.forEach((acc) => accountMap.set(acc.name.toLowerCase(), acc));

      const createdOperations: Operation[] = [];

      await this.prismaService.$transaction(async (tx) => {
        for (const op of operations) {
          if (op.type === OperationType.TRANSFER) {
            // For transfers we interpret categoryName column as the target account name
            const transferAccountName = op.categoryName?.toLowerCase();
            if (!transferAccountName) {
              throw new BadRequestException(OperationError.TRANSFER_TARGET_REQUIRED);
            }

            const transferAccount = accountMap.get(transferAccountName);

            if (!transferAccount) {
              throw new BadRequestException(AccountError.NOT_FOUND);
            }

            if (transferAccount.id === accountId) {
              throw new BadRequestException(OperationError.TRANSFER_ACCOUNT_MUST_DIFFER);
            }

            const amount = new Decimal(op.amount);

            const transferOperation = await tx.operation.create({
              data: {
                amount: op.amount,
                date: new Date(op.date),
                description: op.description,
                type: OperationType.TRANSFER,
                account: { connect: { id: accountId } },
                transferAccount: { connect: { id: transferAccount.id } },
                user: { connect: { id: user.id } },
              },
              include: {
                category: true,
                account: true,
                tags: true,
                transferAccount: true,
              },
            });

            await tx.account.update({
              where: { id: accountId },
              data: {
                balance: {
                  decrement: amount,
                },
              },
            });

            await tx.account.update({
              where: { id: transferAccount.id },
              data: {
                balance: {
                  increment: amount,
                },
              },
            });

            createdOperations.push(transferOperation);
            continue;
          }

          let category = categoryMap.get(op.categoryName.toLowerCase());

          if (!category) {
            const catType =
              op.type === OperationType.INCOME
                ? CategoryType.INCOME
                : CategoryType.EXPENSE;

            category = await tx.category.create({
              data: {
                name: op.categoryName,
                type: catType,
                user: { connect: { id: user.id } },
                icon: 'help-circle',
                color: '#cccccc',
              },
            });
            categoryMap.set(category.name.toLowerCase(), category);
          }

          const amount = new Decimal(op.amount);
          const balanceUpdate =
            op.type === OperationType.INCOME
              ? { increment: amount }
              : { decrement: amount };

          const newOp = await tx.operation.create({
            data: {
              amount: op.amount,
              date: new Date(op.date),
              description: op.description,
              type: op.type,
              category: { connect: { id: category.id } },
              account: { connect: { id: accountId } },
              user: { connect: { id: user.id } },
            },
            include: {
              category: true,
              account: true,
              tags: true,
              transferAccount: true,
            },
          });

          await tx.account.update({
            where: { id: accountId },
            data: {
              balance: balanceUpdate,
            },
          });

          createdOperations.push(newOp);
        }
      });

      return createdOperations;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.CREATION_FAILED);
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
        throw new BadRequestException(OperationError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async findAllSortedByDays(
    user: User,
    filter?: OperationFilterInput,
  ): Promise<
    {
      day: string;
      allIncome: Decimal;
      allExpense: Decimal;
      operations: Operation[];
    }[]
  > {
    try {
      const where: Prisma.OperationWhereInput = {
        user: { id: user.id },
      };

      if (filter) {
        if (filter.dateFrom || filter.dateTo) {
          where.date = {};
          if (filter.dateFrom) {
            where.date.gte = filter.dateFrom;
          }
          if (filter.dateTo) {
            where.date.lte = filter.dateTo;
          }
        }

        if (filter.types && filter.types.length > 0) {
          where.type = { in: filter.types };
        }

        if (filter.categoryIds && filter.categoryIds.length > 0) {
          where.categoryId = { in: filter.categoryIds };
        }

        if (filter.searchDescription) {
          where.description = {
            contains: filter.searchDescription,
            mode: 'insensitive',
          };
        }

        if (filter.accountIds && filter.accountIds.length > 0) {
          where.OR = [
            { accountId: { in: filter.accountIds } },
            { transferAccountId: { in: filter.accountIds } },
          ];
        }
      }

      const operations = await this.prismaService.operation.findMany({
        where,
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
        const allIncome = ops.reduce((sum, op) => {
          if (op.type === OperationType.INCOME) {
            return sum.add(op.amount);
          }
          if (
            op.type === OperationType.TRANSFER &&
            filter?.accountIds &&
            filter.accountIds.length > 0 &&
            op.transferAccountId &&
            filter.accountIds.includes(op.transferAccountId)
          ) {
            return sum.add(op.amount);
          }
          return sum;
        }, new Decimal(0));

        const allExpense = ops.reduce((sum, op) => {
          if (op.type === OperationType.EXPENSE) {
            return sum.add(op.amount);
          }
          if (
            op.type === OperationType.TRANSFER &&
            filter?.accountIds &&
            filter.accountIds.length > 0 &&
            filter.accountIds.includes(op.accountId)
          ) {
            return sum.add(op.amount);
          }
          return sum;
        }, new Decimal(0));

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
        throw new BadRequestException(OperationError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async findAllForCharts(
    user: User,
    filter?: OperationChartsFilterInput,
  ) {
    try {
      const where: Prisma.OperationWhereInput = {
        user: { id: user.id },
        type: { not: OperationType.TRANSFER },
      };

      if (filter) {
        if (filter.dateFrom || filter.dateTo) {
          where.date = {};
          if (filter.dateFrom) {
            where.date.gte = filter.dateFrom;
          }
          if (filter.dateTo) {
            where.date.lte = filter.dateTo;
          }
        }

        if (filter.categoryIds && filter.categoryIds.length > 0) {
          where.categoryId = { in: filter.categoryIds };
        }

        if (filter.searchDescription) {
          where.description = {
            contains: filter.searchDescription,
            mode: 'insensitive',
          };
        }

        if (filter.accountIds && filter.accountIds.length > 0) {
          where.OR = [
            { accountId: { in: filter.accountIds } },
            { transferAccountId: { in: filter.accountIds } },
          ];
        }
      }

      const operations = await this.prismaService.operation.findMany({
        where,
        include: {
          category: true,
          account: true,
          tags: true,
          transferAccount: true,
        },
        orderBy: { date: 'asc' },
      });

      // Определяем диапазон дат
      const dateFrom = filter?.dateFrom
        ? new Date(filter.dateFrom)
        : operations.length > 0
          ? operations[0].date
          : new Date();
      const dateTo = filter?.dateTo
        ? new Date(filter.dateTo)
        : operations.length > 0
          ? operations[operations.length - 1].date
          : new Date();

      const diffTime = dateTo.getTime() - dateFrom.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const byDays = operations.reduce((acc, operation) => {
        const day = operation.date.toISOString().split('T')[0];
        acc[operation.type][day] = (acc[operation.type][day] || 0) + operation.amount.toNumber();
        return acc;
      }, {
        [OperationType.INCOME]: {},
        [OperationType.EXPENSE]: {},
      });

      const incomeDays = Object.keys(byDays[OperationType.INCOME]).length;
      const expenseDays = Object.keys(byDays[OperationType.EXPENSE]).length;
      const incomeGroupSize = calculateGroupSize(incomeDays);
      const expenseGroupSize = calculateGroupSize(expenseDays);

      const incomeByDays = groupDays(
        byDays[OperationType.INCOME],
        incomeGroupSize,
      );
      const expenseByDays = groupDays(
        byDays[OperationType.EXPENSE],
        expenseGroupSize,
      );

      const incomeAll = Object.values(byDays[OperationType.INCOME] as Record<string, number>).reduce(
        (sum: number, amount: number) => sum + amount,
        0,
      );
      const expenseAll = Object.values(byDays[OperationType.EXPENSE] as Record<string, number>).reduce(
        (sum: number, amount: number) => sum + amount,
        0,
      );

      const incomeByCategories = new Map<string, { category: any; amount: number }>();
      const expenseByCategories = new Map<string, { category: any; amount: number }>();

      operations.forEach((operation) => {
        if (!operation.category) return;

        const categoryId = operation.category.id;
        const amount = operation.amount.toNumber();

        if (operation.type === OperationType.INCOME) {
          const existing = incomeByCategories.get(categoryId);
          if (existing) {
            existing.amount += amount;
          } else {
            incomeByCategories.set(categoryId, {
              category: operation.category,
              amount,
            });
          }
        } else if (operation.type === OperationType.EXPENSE) {
          const existing = expenseByCategories.get(categoryId);
          if (existing) {
            existing.amount += amount;
          } else {
            expenseByCategories.set(categoryId, {
              category: operation.category,
              amount,
            });
          }
        }
      });

      // Вычисляем предыдущий период только если type !== "custom"
      let incomeChangePercent: string | undefined;
      let expenseChangePercent: string | undefined;
      let previousIncomeAll = 0;
      let previousExpenseAll = 0;
      let previousIncomeByCategories = new Map<string, number>();
      let previousExpenseByCategories = new Map<string, number>();

      if (filter?.type && filter.type !== 'custom') {
        // Вычисляем предыдущий период в зависимости от типа
        let previousDateFrom: Date;
        let previousDateTo: Date;

        if (filter.type === 'week') {
          // Предыдущая неделя (7 дней назад)
          previousDateTo = new Date(dateFrom);
          previousDateTo.setDate(previousDateTo.getDate() - 1);
          previousDateFrom = new Date(previousDateTo);
          previousDateFrom.setDate(previousDateFrom.getDate() - 6);
        } else if (filter.type === 'month') {
          // Предыдущий месяц (тот же диапазон, но месяц назад)
          previousDateTo = new Date(dateTo);
          previousDateTo.setMonth(previousDateTo.getMonth() - 1);
          previousDateFrom = new Date(dateFrom);
          previousDateFrom.setMonth(previousDateFrom.getMonth() - 1);
        } else if (filter.type === 'year') {
          // Предыдущий год (тот же диапазон, но год назад)
          previousDateTo = new Date(dateTo);
          previousDateTo.setFullYear(previousDateTo.getFullYear() - 1);
          previousDateFrom = new Date(dateFrom);
          previousDateFrom.setFullYear(previousDateFrom.getFullYear() - 1);
        } else {
          // Fallback: предыдущий период такой же длины
          previousDateTo = new Date(dateFrom);
          previousDateTo.setDate(previousDateTo.getDate() - 1);
          previousDateFrom = new Date(previousDateTo);
          previousDateFrom.setDate(previousDateFrom.getDate() - diffDays + 1);
        }

        // Получаем операции для предыдущего периода
        const previousWhere: Prisma.OperationWhereInput = {
          user: { id: user.id },
          type: { not: OperationType.TRANSFER },
          date: {
            gte: previousDateFrom,
            lte: previousDateTo,
          },
        };

        // Применяем те же фильтры, что и для текущего периода
        if (filter.categoryIds && filter.categoryIds.length > 0) {
          previousWhere.categoryId = { in: filter.categoryIds };
        }

        if (filter.searchDescription) {
          previousWhere.description = {
            contains: filter.searchDescription,
            mode: 'insensitive',
          };
        }

        if (filter.accountIds && filter.accountIds.length > 0) {
          previousWhere.OR = [
            { accountId: { in: filter.accountIds } },
            { transferAccountId: { in: filter.accountIds } },
          ];
        }

        const previousOperations = await this.prismaService.operation.findMany({
          where: previousWhere,
          include: {
            category: true,
          },
        });

        // Вычисляем суммы для предыдущего периода
        const previousByDays = previousOperations.reduce((acc, operation) => {
          acc[operation.type] = (acc[operation.type] || 0) + operation.amount.toNumber();
          return acc;
        }, {
          [OperationType.INCOME]: 0,
          [OperationType.EXPENSE]: 0,
        });

        previousIncomeAll = previousByDays[OperationType.INCOME];
        previousExpenseAll = previousByDays[OperationType.EXPENSE];

        // Группируем операции предыдущего периода по категориям
        previousOperations.forEach((operation) => {
          if (!operation.category) return;

          const categoryId = operation.category.id;
          const amount = operation.amount.toNumber();

          if (operation.type === OperationType.INCOME) {
            const existing = previousIncomeByCategories.get(categoryId) || 0;
            previousIncomeByCategories.set(categoryId, existing + amount);
          } else if (operation.type === OperationType.EXPENSE) {
            const existing = previousExpenseByCategories.get(categoryId) || 0;
            previousExpenseByCategories.set(categoryId, existing + amount);
          }
        });
      }

      // Функция для вычисления процента изменения
      const calculateChangePercent = (current: number, previous: number): string | undefined => {
        if (previous === 0) {
          return current > 0 ? '100' : current < 0 ? '-100' : '0';
        }
        const change = ((current - previous) / previous) * 100;
        return change.toFixed(2);
      };

      // Вычисляем процент изменения для общих сумм
      if (filter?.type && filter.type !== 'custom') {
        incomeChangePercent = calculateChangePercent(incomeAll, previousIncomeAll);
        expenseChangePercent = calculateChangePercent(expenseAll, previousExpenseAll);
      }

      // Вычисляем средние значения в зависимости от длительности периода
      const calculateAverages = (total: number, days: number) => {
        const dayAverage = days > 0 ? (total / days).toFixed(2) : '0';
        
        // от недели до 2 недель: только средний за день
        if (days < 15) {
          return {
            dayAverage,
          };
        }
        
        // от 2 недель до 2 месяцев: + средний за неделю
        const weekAverage = days > 0 ? (total / (days / 7)).toFixed(2) : '0';
        if (days < 61) {
          return {
            dayAverage,
            weekAverage,
          };
        }
        
        // от 2 месяцев до 2 лет: + средний за месяц
        const monthAverage = days > 0 ? (total / (days / 30)).toFixed(2) : '0';
        if (days < 731) {
          return {
            dayAverage,
            weekAverage,
            monthAverage,
          };
        }
        
        // от 2 лет и более: + средний за год
        const yearAverage = days > 0 ? (total / (days / 365)).toFixed(2) : '0';
        return {
          dayAverage,
          weekAverage,
          monthAverage,
          yearAverage,
        };
      };

      const incomeAverages = calculateAverages(incomeAll, diffDays);
      const expenseAverages = calculateAverages(expenseAll, diffDays);

      // Формируем массив категорий для доходов
      const incomeCategories: Categories[] = Array.from(incomeByCategories.values())
        .map(({ category, amount }) => {
          const percent = incomeAll > 0 ? ((amount / incomeAll) * 100).toFixed(2) : '0';
          const previousAmount = filter.type && filter.type !== 'custom' 
            ? (previousIncomeByCategories.get(category.id) || 0)
            : 0;
          const changePercent = filter.type && filter.type !== 'custom'
            ? calculateChangePercent(amount, previousAmount)
            : undefined;

          return {
            category,
            all: new Decimal(amount),
            percent,
            changePercent,
          };
        })
        .sort((a, b) => b.all.toNumber() - a.all.toNumber()); // Сортируем по убыванию суммы

      // Формируем массив категорий для расходов
      const expenseCategories: Categories[] = Array.from(expenseByCategories.values())
        .map(({ category, amount }) => {
          const percent = expenseAll > 0 ? ((amount / expenseAll) * 100).toFixed(2) : '0';
          const previousAmount = filter.type && filter.type !== 'custom'
            ? (previousExpenseByCategories.get(category.id) || 0)
            : 0;
          const changePercent = filter.type && filter.type !== 'custom'
            ? calculateChangePercent(amount, previousAmount)
            : undefined;

          return {
            category,
            all: new Decimal(amount),
            percent,
            changePercent,
          };
        })
        .sort((a, b) => b.all.toNumber() - a.all.toNumber()); // Сортируем по убыванию суммы

      return {
        income: {
          all: new Decimal(incomeAll),
          byDays: incomeByDays,
          averages: incomeAverages,
          categories: incomeCategories,
          groupSize: incomeGroupSize,
          changePercent: incomeChangePercent,
        },
        expense: {
          all: new Decimal(expenseAll),
          byDays: expenseByDays,
          averages: expenseAverages,
          categories: expenseCategories,
          groupSize: expenseGroupSize,
          changePercent: expenseChangePercent,
        },
      };
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.NOT_FOUND);
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
        throw new NotFoundException(OperationError.NOT_FOUND);
      }

      return operation;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async update(
    input: UpdateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      if (input.recurrence) {
        throw new BadRequestException(RecurrenceError.UPDATE_NOT_ALLOWED);
      }

      if (input.accountId) {
        const account = await this.prismaService.account.findFirst({
          where: { id: input.accountId, userId: user.id },
        });

        if (!account) {
          throw new BadRequestException(AccountError.NOT_FOUND);
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

      if (input.tags) {
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

      if (input.accountId === input.transferAccountId) {
        throw new BadRequestException(OperationError.TRANSFER_SAME_ACCOUNT);
      }

      const existingOperation = await this.prismaService.operation.findFirst({
        where: {
          id: input.id,
          account: { userId: user.id },
        },
        include: {
          account: true,
          transferAccount: true,
        },
      });

      if (!existingOperation) {
        throw new NotFoundException(OperationError.NOT_FOUND);
      }

      const updated = await this.prismaService.$transaction(async (tx) => {
        const oldAmount = new Decimal(existingOperation.amount);
        const newAmount = new Decimal(input.amount ?? existingOperation.amount);
        const oldType = existingOperation.type;
        const newType = input.type ?? existingOperation.type;
        const oldAccountId = existingOperation.accountId;
        const newAccountId = input.accountId ?? existingOperation.accountId;
        const oldTransferAccountId = existingOperation.transferAccountId;
        const newTransferAccountId =
          input.transferAccountId ?? existingOperation.transferAccountId;

        // Revert old operation's effect on balance
        if (oldType === OperationType.TRANSFER) {
          if (oldAccountId) {
            await tx.account.update({
              where: { id: oldAccountId },
              data: { balance: { increment: oldAmount } },
            });
          }
          if (oldTransferAccountId) {
            await tx.account.update({
              where: { id: oldTransferAccountId },
              data: { balance: { decrement: oldAmount } },
            });
          }
        } else if (oldAccountId) {
          const oldBalanceUpdate =
            oldType === OperationType.INCOME
              ? { decrement: oldAmount }
              : { increment: oldAmount };
          await tx.account.update({
            where: { id: oldAccountId },
            data: { balance: oldBalanceUpdate },
          });
        }

        // Apply new operation's effect on balance
        if (newType === OperationType.TRANSFER) {
          if (newAccountId) {
            await tx.account.update({
              where: { id: newAccountId },
              data: { balance: { decrement: newAmount } },
            });
          }
          if (newTransferAccountId) {
            await tx.account.update({
              where: { id: newTransferAccountId },
              data: { balance: { increment: newAmount } },
            });
          }
        } else if (newAccountId) {
          const newBalanceUpdate =
            newType === OperationType.INCOME
              ? { increment: newAmount }
              : { decrement: newAmount };
          await tx.account.update({
            where: { id: newAccountId },
            data: { balance: newBalanceUpdate },
          });
        }

        return await tx.operation.update({
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
            transferAccount: input.transferAccountId
              ? {
                  connect: { id: input.transferAccountId },
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
            transferAccount: true,
          },
        });
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.UPDATE_FAILED);
      }

      throw error;
    }
  }

  public async delete(id: string, user: User): Promise<boolean> {
    try {
      const operation = await this.prismaService.operation.findFirst({
        where: {
          id,
          account: { userId: user.id },
        },
        include: {
          account: true,
          transferAccount: true,
        },
      });

      if (!operation) {
        throw new NotFoundException(OperationError.NOT_FOUND);
      }

      const result = await this.prismaService.$transaction(async (tx) => {
        const amount = new Decimal(operation.amount);

        if (operation.type === OperationType.TRANSFER) {
          if (operation.accountId) {
            await tx.account.update({
              where: { id: operation.accountId },
              data: { balance: { increment: amount } },
            });
          }
          if (operation.transferAccountId) {
            await tx.account.update({
              where: { id: operation.transferAccountId },
              data: { balance: { decrement: amount } },
            });
          }
        } else if (operation.accountId) {
          const balanceUpdate =
            operation.type === OperationType.INCOME
              ? { decrement: amount }
              : { increment: amount };
          await tx.account.update({
            where: { id: operation.accountId },
            data: { balance: balanceUpdate },
          });
        }

        return await tx.operation.delete({
          where: { id },
        });
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.DELETION_FAILED);
      }

      throw error;
    }
  }

  public async deleteAll(user: User): Promise<boolean> {
    try {
      await this.prismaService.$transaction(async (tx) => {
        // 1. Delete all operations
        await tx.operation.deleteMany({
          where: { userId: user.id },
        });

        // 2. Reset all accounts to initial balance
        const accounts = await tx.account.findMany({
          where: { userId: user.id },
        });

        for (const account of accounts) {
          await tx.account.update({
            where: { id: account.id },
            data: { balance: account.initialBalance },
          });
        }
      });

      return true;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(OperationError.DELETION_FAILED);
      }

      throw error;
    }
  }
}
