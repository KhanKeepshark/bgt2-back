import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAccountInput } from './inputs/create-account.input';
import { Account, User } from '@prisma/generated';
import { UpdateAccountInput } from './inputs/update-account.input';
import { AccountError, SubscriptionError } from '@back/shared/constants/errors.constants';

@Injectable()
export class AccountService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(input: CreateAccountInput, user: User): Promise<Account> {
    try {
      const existingAccount = await this.prismaService.account.findFirst({
        where: { name: input.name, userId: user.id },
      });

      if (existingAccount) {
        throw new BadRequestException(AccountError.ALREADY_EXISTS);
      }

      // Проверка лимитов плана
      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: user.id },
        include: { subscriptionPlan: true, _count: { select: { accounts: true } } },
      });

      if (userWithPlan?.subscriptionPlan?.maxAccounts !== null) {
        if (userWithPlan._count.accounts >= userWithPlan.subscriptionPlan.maxAccounts) {
          throw new BadRequestException({
            key: SubscriptionError.LIMIT_REACHED,
            args: { max: userWithPlan.subscriptionPlan.maxAccounts },
          });
        }
      }

      const initialBalance =  input.balance ?? '0';

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
          currency: 'USD',
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

  public async findAll(user: User): Promise<Account[]> {
    try {
      const accounts = await this.prismaService.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      return accounts;
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
          where: { name: input.name, userId: user.id },
        });

        if (existingAccount) {
          throw new BadRequestException(
            AccountError.ALREADY_EXISTS,
          );
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
      const result = await this.prismaService.account.delete({
        where: { id, userId: user.id },
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(AccountError.DELETION_FAILED);
      }

      throw error;
    }
  }
}
