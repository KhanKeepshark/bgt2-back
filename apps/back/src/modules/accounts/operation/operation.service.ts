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
import {
  AccountError,
  CategoryError,
  OperationError,
  RecurrenceError,
  TagError,
} from '@back/shared/constants/errors.constants';
import { LimitGateService } from '@back/shared/limit-gate/limit-gate.service';
import { assertOperationDateInHotWindow } from '@back/shared/operation-retention/operation-retention.util';
import { ChartsDataService } from './charts/charts-data.service';

@Injectable()
export class OperationService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly recurrenceService: RecurrenceService,
    private readonly limitGate: LimitGateService,
    private readonly chartsDataService: ChartsDataService,
  ) {}

  public async create(
    input: CreateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      await this.limitGate.assertCanCreateOperations(user.id);
      assertOperationDateInHotWindow(input.date);

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
          throw new BadRequestException(AccountError.NOT_FOUND);
        }

        if (input.accountId === input.transferAccountId) {
          throw new BadRequestException(OperationError.TRANSFER_SAME_ACCOUNT);
        }

        const amount = new Decimal(input.amount).abs();

        const createTransferOperation = await this.prismaService.$transaction(
          async (tx) => {
            const operation = await tx.operation.create({
              data: {
                amount: amount,
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

      const amount = new Decimal(input.amount).abs();
      const balanceUpdate =
        input.type === OperationType.INCOME
          ? { increment: amount }
          : { decrement: amount };

      const created = await this.prismaService.$transaction(async (tx) => {
        const operation = await tx.operation.create({
          data: {
            amount: amount,
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
      await this.limitGate.assertCanCreateOperations(
        user.id,
        operations.length,
      );

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

      for (const op of operations) {
        assertOperationDateInHotWindow(new Date(op.date));
      }

      const createdOperations: Operation[] = [];

      await this.prismaService.$transaction(async (tx) => {
        for (const op of operations) {
          if (op.type === OperationType.TRANSFER) {
            // For transfers we interpret categoryName column as the target account name
            const transferAccountName = op.categoryName?.toLowerCase();
            if (!transferAccountName) {
              throw new BadRequestException(
                OperationError.TRANSFER_TARGET_REQUIRED,
              );
            }

            const transferAccount = accountMap.get(transferAccountName);

            if (!transferAccount) {
              throw new BadRequestException(AccountError.NOT_FOUND);
            }

            if (transferAccount.id === accountId) {
              throw new BadRequestException(
                OperationError.TRANSFER_ACCOUNT_MUST_DIFFER,
              );
            }

            const amount = new Decimal(op.amount).abs();

            const transferOperation = await tx.operation.create({
              data: {
                amount: amount,
                date: new Date(op.date),
                description: op.description,
                type: OperationType.TRANSFER,
                account: { connect: { id: accountId } },
                transferAccount: { connect: { id: transferAccount.id } },
                user: { connect: { id: user.id } },
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

          if (!op.categoryName || op.categoryName.trim() === '') {
            throw new BadRequestException(OperationError.CATEGORY_REQUIRED);
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

          const amount = new Decimal(op.amount).abs();
          const balanceUpdate =
            op.type === OperationType.INCOME
              ? { increment: amount }
              : { decrement: amount };

          const newOp = await tx.operation.create({
            data: {
              amount: amount,
              date: new Date(op.date),
              description: op.description,
              type: op.type,
              category: { connect: { id: category.id } },
              account: { connect: { id: accountId } },
              user: { connect: { id: user.id } },
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

  public async countUserOperations(user: User): Promise<number> {
    return this.prismaService.operation.count({
      where: { userId: user.id },
    });
  }

  public async findAll(user: User): Promise<Operation[]> {
    try {
      const operations = await this.prismaService.operation.findMany({
        where: {
          account: { userId: user.id },
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
      const conditions: Prisma.Sql[] = [Prisma.sql`"userId" = ${user.id}`];

      if (filter) {
        if (filter.dateFrom) {
          conditions.push(Prisma.sql`"date" >= ${filter.dateFrom}::timestamp`);
        }
        if (filter.dateTo) {
          conditions.push(Prisma.sql`"date" <= ${filter.dateTo}::timestamp`);
        }
        if (filter.types && filter.types.length > 0) {
          const typesJoined = Prisma.join(
            filter.types.map((t) => Prisma.sql`${t}::"OperationType"`),
          );
          conditions.push(Prisma.sql`"type" IN (${typesJoined})`);
        }
        if (filter.categoryIds && filter.categoryIds.length > 0) {
          const catIds = Prisma.join(
            filter.categoryIds.map((id) => Prisma.sql`${id}`),
          );
          conditions.push(Prisma.sql`"categoryId" IN (${catIds})`);
        }
        if (filter.searchDescription) {
          conditions.push(
            Prisma.sql`"description" ILIKE ${'%' + filter.searchDescription + '%'}`,
          );
        }
        if (filter.accountIds && filter.accountIds.length > 0) {
          const accIds = Prisma.join(
            filter.accountIds.map((id) => Prisma.sql`${id}`),
          );
          conditions.push(
            Prisma.sql`("accountId" IN (${accIds}) OR "transferAccountId" IN (${accIds}))`,
          );
        }
      }

      const whereClause = Prisma.sql`${Prisma.join(conditions, ' AND ')}`;

      const result = await this.prismaService.$queryRaw<any[]>`
        SELECT 
          TO_CHAR("date", 'YYYY-MM-DD') as day,
          COALESCE(SUM(CASE WHEN "type" = 'INCOME' THEN "amount" ELSE 0 END), 0) as "allIncome",
          COALESCE(SUM(CASE WHEN "type" = 'EXPENSE' THEN "amount" ELSE 0 END), 0) as "allExpense",
          COALESCE(SUM(CASE WHEN "type" = 'TRANSFER' AND "transferAccountId" IN (
            ${filter?.accountIds && filter.accountIds.length > 0 ? Prisma.join(filter.accountIds.map((id) => Prisma.sql`${id}`)) : Prisma.sql`NULL`}
          ) THEN "amount" ELSE 0 END), 0) as "transferIncome",
          COALESCE(SUM(CASE WHEN "type" = 'TRANSFER' AND "accountId" IN (
            ${filter?.accountIds && filter.accountIds.length > 0 ? Prisma.join(filter.accountIds.map((id) => Prisma.sql`${id}`)) : Prisma.sql`NULL`}
          ) THEN "amount" ELSE 0 END), 0) as "transferExpense",
          json_agg(
            json_build_object(
              'id', id,
              'amount', amount,
              'date', date,
              'description', description,
              'type', type,
              'userId', "userId",
              'accountId', "accountId",
              'transferAccountId', "transferAccountId",
              'categoryId', "categoryId",
              'recurrenceConfigId', "recurrenceConfigId",
              'createdAt', "createdAt",
              'updatedAt', "updatedAt"
            ) ORDER BY date DESC
          ) as operations
        FROM "Operation"
        WHERE ${whereClause}
        GROUP BY TO_CHAR("date", 'YYYY-MM-DD')
        ORDER BY day DESC
      `;

      return result.map((row) => ({
        day: row.day,
        allIncome: new Decimal(row.allIncome).add(
          new Decimal(row.transferIncome),
        ),
        allExpense: new Decimal(row.allExpense).add(
          new Decimal(row.transferExpense),
        ),
        operations: row.operations.map((op: any) => ({
          ...op,
          amount: new Decimal(op.amount),
          date: new Date(op.date),
          createdAt: new Date(op.createdAt),
          updatedAt: new Date(op.updatedAt),
        })),
      }));
    } catch (error) {
      console.log('error', error);
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
    return this.chartsDataService.findAllForCharts(user, filter);
  }

  public async findOne(id: string, user: User): Promise<Operation> {
    try {
      const operation = await this.prismaService.operation.findFirst({
        where: {
          id,
          account: { userId: user.id },
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
          throw new BadRequestException(AccountError.NOT_FOUND);
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
      });

      if (!existingOperation) {
        throw new NotFoundException(OperationError.NOT_FOUND);
      }

      if (input.date) {
        assertOperationDateInHotWindow(input.date);
      }

      const updated = await this.prismaService.$transaction(async (tx) => {
        const oldAmount = new Decimal(existingOperation.amount).abs();
        const newAmount = new Decimal(
          input.amount ?? existingOperation.amount,
        ).abs();
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
            amount: newAmount,
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
      });

      if (!operation) {
        throw new NotFoundException(OperationError.NOT_FOUND);
      }

      const result = await this.prismaService.$transaction(async (tx) => {
        const amount = new Decimal(operation.amount).abs();

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
