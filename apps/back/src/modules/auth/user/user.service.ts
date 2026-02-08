import { Prisma } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CreateUserInput } from './inputs/create-user.input';
import { UpdateUserInput } from './inputs/update-user.input';
import { UserWhereInput } from './inputs/user-where.input';
import { UserOrderByInput } from './inputs/user-order-by.input';
import { hash } from 'argon2';
import { VerificationService } from '../verification/verification.service';
import { AccountService } from '../../accounts/account/account.service';
import { CategoryService } from '../../accounts/category/category.service';

@Injectable()
export class UserService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly accountService: AccountService,
    private readonly categoryService: CategoryService,
    private readonly verificationService: VerificationService,
  ) {}

  public async findAll(
    page = 1,
    items = 10,
    where?: UserWhereInput,
    orderBy?: UserOrderByInput,
  ) {
    const skip = (page - 1) * items;
    const whereCondition = where ? (where as Prisma.UserWhereInput) : undefined;
    const orderByCondition = orderBy
      ? (orderBy as Prisma.UserOrderByWithRelationInput)
      : undefined;

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        skip,
        take: items,
        where: whereCondition,
        orderBy: orderByCondition,
        include: {
          subscriptionPlan: true,
        },
      }),
      this.prismaService.user.count({ where: whereCondition }),
    ]);

    return { items: users, total };
  }

  public async me(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      include: {
        accounts: true,
        tags: true,
        categories: {
          include: {
            children: true,
          },
        },
        subscriptionPlan: true,
      },
    });

    return user;
  }

  public async create(input: CreateUserInput) {
    const { email, password } = input;

    const isEmailExists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (isEmailExists) {
      throw new ConflictException('Email already exists');
    }

    const plan = await this.prismaService.subscriptionPlan.findFirst({
      where: { name: 'FREE', isActive: true },
    });

    if (!plan) {
      throw new BadRequestException('Default subscription plan "FREE" not found');
    }

    const subscriptionStartedAt = new Date();
    const subscriptionExpiresAt =
      plan.durationDays !== null
        ? new Date(
            subscriptionStartedAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
          )
        : null;

    const user = await this.prismaService.user.create({
      data: {
        email,
        password: await hash(password),
        role: 'USER',
        lastLoginAt: subscriptionStartedAt,
        subscriptionPlanId: plan.id,
        subscriptionStartedAt,
        subscriptionExpiresAt,
        tokensBalance: plan.tokensOnPurchase ?? 0,
      },
    });

    const defaultAccount = await this.accountService.createDefault(user);
    user.defaultAccountId = defaultAccount.id;
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { defaultAccountId: defaultAccount.id },
    });
    await this.categoryService.createDefault(user);

    // await this.verificationService.sendVerificationEmail(user);

    return true;
  }

  public async findOne(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        accounts: true,
        categories: true,
        aiTokenUsages: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  public async update(input: UpdateUserInput) {
    const { id, ...data } = input;

    if (data.password) {
      data.password = await hash(data.password);
    }

    return this.prismaService.user.update({
      where: { id },
      data,
      include: {
        subscriptionPlan: true,
      },
    });
  }

  public async remove(id: string) {
    return this.prismaService.user.delete({
      where: { id },
    });
  }
}
