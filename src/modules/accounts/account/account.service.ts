import { PrismaService } from '@/src/core/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountInput } from './inputs/create-account.input';
import { Account, User } from '@/prisma/generated';
import { UpdateAccountInput } from './inputs/update-account.input';

@Injectable()
export class AccountService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(input: CreateAccountInput, user: User): Promise<Account> {
    return this.prismaService.account.create({
      data: {
        ...input,
        user: {
          connect: { id: user.id },
        },
      },
    });
  }

  public async findAll(user: User): Promise<Account[]> {
    return this.prismaService.account.findMany({
      where: { userId: user.id },
    });
  }

  public async findOne(id: string, user: User): Promise<Account> {
    const account = await this.prismaService.account.findFirst({
      where: { id, userId: user.id },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  public async update(input: UpdateAccountInput, user: User): Promise<Account> {
    const result = await this.prismaService.account.updateMany({
      where: { id: input.id, userId: user.id },
      data: input,
    });

    if (result.count === 0) {
      throw new NotFoundException('Account not found');
    }

    return this.findOne(input.id, user);
  }

  public async delete(id: string, user: User): Promise<boolean> {
    const result = await this.prismaService.account.deleteMany({
      where: { id, userId: user.id },
    });

    return result.count > 0;
  }
}
