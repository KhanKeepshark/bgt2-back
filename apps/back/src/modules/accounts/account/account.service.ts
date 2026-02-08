import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAccountInput } from './inputs/create-account.input';
import { Account, User } from '@prisma/generated';
import { UpdateAccountInput } from './inputs/update-account.input';

@Injectable()
export class AccountService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(input: CreateAccountInput, user: User): Promise<Account> {
    try {
      const existingAccount = await this.prismaService.account.findFirst({
        where: { name: input.name, userId: user.id },
      });

      if (existingAccount) {
        throw new BadRequestException('Account with this name already exists');
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
        throw new BadRequestException('Failed to create account');
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
        throw new BadRequestException('Failed to create default account');
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
        throw new BadRequestException('Failed to find accounts');
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
        throw new NotFoundException('Account not found');
      }

      return account;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find account');
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
            'Account with this name already exists',
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
        throw new BadRequestException('Failed to update account');
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
        throw new BadRequestException('Failed to delete account');
      }

      throw error;
    }
  }
}
