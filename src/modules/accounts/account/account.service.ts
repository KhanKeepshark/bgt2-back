import { PrismaService } from '@/src/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateAccountInput } from './inputs/create-account.input';
import { User } from '@/prisma/generated';
import { UpdateAccountInput } from './inputs/update-account.input';

@Injectable()
export class AccountService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(input: CreateAccountInput, user: User) {
    return this.prismaService.account.create({
      data: {
        ...input,
        user: {
          connect: { id: user.id },
        },
      },
    });
  }

  public async findAll(user: User) {
    return this.prismaService.account.findMany({
      where: { userId: user.id },
    });
  }

  public async update(input: UpdateAccountInput) {
    return this.prismaService.account.update({
      where: { id: input.id },
      data: input,
    });
  }
}
