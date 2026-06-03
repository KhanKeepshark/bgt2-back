import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAccountInput } from './inputs/create-account.input';
import { Account, User } from '@prisma/generated';
import { UpdateAccountInput } from './inputs/update-account.input';
import { AccountError } from '@back/shared/constants/errors.constants';
import { LimitGateService } from '@back/shared/limit-gate/limit-gate.service';

@Injectable()
export class AccountService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly limitGate: LimitGateService,
  ) {}

  public async create(input: CreateAccountInput, user: User): Promise<Account> {
    try {
      const existingAccount = await this.prismaService.account.findFirst({
        where: { name: input.name, userId: user.id },
      });

      if (existingAccount) {
        throw new BadRequestException(AccountError.ALREADY_EXISTS);
      }

      const accountCount = await this.prismaService.account.count({
        where: { userId: user.id },
      });

      await this.limitGate.assertCanCreateAccount(user.id);

      const initialBalance = input.balance ?? '0';

      const created = await this.prismaService.account.create({
        data: {
          name: input.name,
          currency: input.currency,
          icon: input.icon,
          iconColor: input.iconColor,
          initialBalance,
          balance: initialBalance,
          user: {
            connect: { id: user.id },
          },
        },
      });

      // Если это первый аккаунт пользователя — делаем его defaultAccount
      if (accountCount === 0) {
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { defaultAccountId: created.id },
        });
      }

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(AccountError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async createDefault(user: User): Promise<Account> {
    try {
      const created = await this.prismaService.account.create({
        data: {
          name: 'Default',
          icon: 'wallet',
          currency: 'KZT',
          initialBalance: '0',
          balance: '0',
          user: {
            connect: { id: user.id },
          },
        },
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(AccountError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async findAll(
    user: User,
  ): Promise<(Account & { isDefault: boolean })[]> {
    try {
      const accounts = await this.prismaService.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      return accounts.map((account) => ({
        ...account,
        isDefault: account.id === user.defaultAccountId,
      }));
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(AccountError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async findOne(id: string): Promise<Account> {
    try {
      const account = await this.prismaService.account.findFirst({
        where: { id },
      });

      if (!account) {
        throw new NotFoundException(AccountError.NOT_FOUND);
      }

      return account;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(AccountError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async update(input: UpdateAccountInput, user: User): Promise<Account> {
    try {
      if (input.name) {
        const existingAccount = await this.prismaService.account.findFirst({
          where: {
            name: input.name,
            userId: user.id,
            id: { not: input.id },
          },
        });

        if (existingAccount) {
          throw new BadRequestException(AccountError.ALREADY_EXISTS);
        }
      }

      const updated = await this.prismaService.account.update({
        where: { id: input.id, userId: user.id },
        data: input,
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(AccountError.UPDATE_FAILED);
      }

      throw error;
    }
  }

  public async delete(id: string, user: User): Promise<boolean> {
    try {
      const accountsCount = await this.prismaService.account.count({
        where: { userId: user.id },
      });

      if (accountsCount <= 1) {
        throw new BadRequestException(AccountError.CANNOT_DELETE_LAST);
      }

      const accountToDelete = await this.prismaService.account.findFirst({
        where: { id, userId: user.id },
      });

      if (!accountToDelete) {
        throw new NotFoundException(AccountError.NOT_FOUND);
      }

      const isDeletingDefault = user.defaultAccountId === id;

      if (isDeletingDefault) {
        const nextDefaultAccount = await this.prismaService.account.findFirst({
          where: { userId: user.id, id: { not: id } },
          orderBy: { createdAt: 'asc' },
        });

        if (nextDefaultAccount) {
          await this.prismaService.user.update({
            where: { id: user.id },
            data: { defaultAccountId: nextDefaultAccount.id },
          });
        }
      }

      const result = await this.prismaService.account.delete({
        where: { id, userId: user.id },
      });

      return !!result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(AccountError.DELETION_FAILED);
      }

      throw error;
    }
  }

  public async hasOperations(id: string, user: User): Promise<boolean> {
    const operationsCount = await this.prismaService.operation.count({
      where: {
        OR: [{ accountId: id }, { transferAccountId: id }],
        userId: user.id,
      },
    });

    const recurrencesCount = await this.prismaService.recurrenceConfig.count({
      where: {
        OR: [{ accountId: id }, { transferAccountId: id }],
        userId: user.id,
      },
    });

    return operationsCount > 0 || recurrencesCount > 0;
  }
}
