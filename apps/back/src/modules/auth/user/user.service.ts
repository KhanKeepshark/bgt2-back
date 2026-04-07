import { Prisma, SubscriptionType, Role } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateUserInput } from './inputs/create-user.input';
import {
  AuthError,
  SubscriptionError,
} from '@back/shared/constants/errors.constants';
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
          subscriptionPrice: true,
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
        subscriptionPlan: {
          include: {
            prices: true,
          },
        },
        subscriptionPrice: true,
      },
    });

    return user;
  }

  public async create(input: CreateUserInput) {
    const { email, password, language } = input;

    const isEmailExists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (isEmailExists) {
      throw new ConflictException(AuthError.EMAIL_EXISTS);
    }

    const plan = await this.prismaService.subscriptionPlan.findUnique({
      where: { type: SubscriptionType.FREE },
      include: { prices: true },
    });

    if (!plan) {
      throw new BadRequestException(SubscriptionError.PLAN_NOT_FOUND);
    }

    const price = plan.prices[0];

    const subscriptionStartedAt = new Date();
    const subscriptionExpiresAt = price?.durationDays
      ? new Date(
          subscriptionStartedAt.getTime() +
            price.durationDays * 24 * 60 * 60 * 1000,
        )
      : null;

    const user = await this.prismaService.user.create({
      data: {
        email,
        password: await hash(password),
        role: 'USER',
        lastLoginAt: subscriptionStartedAt,
        subscriptionPlanId: plan.id,
        subscriptionPriceId: price?.id,
        subscriptionStartedAt,
        subscriptionExpiresAt,
        tokensBalance: plan.tokensOnPurchase ?? 0,
      },
    });

    await this.accountService.create(
      { name: 'Default', currency: 'USD', icon: 'wallet' },
      user,
    );
    await this.categoryService.createDefault(user);

    await this.verificationService.sendVerificationEmail(user, language);

    return true;
  }

  public async createFromGoogle(email: string, name: string) {
    const isEmailExists = await this.prismaService.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        tags: true,
        categories: {
          include: {
            children: true,
            keywords: true,
          },
        },
        subscriptionPlan: true,
      },
    });

    if (isEmailExists) {
      return isEmailExists;
    }

    const plan = await this.prismaService.subscriptionPlan.findUnique({
      where: { type: SubscriptionType.FREE },
      include: { prices: true },
    });

    if (!plan) {
      throw new BadRequestException(SubscriptionError.PLAN_NOT_FOUND);
    }

    const price = plan.prices[0];

    const subscriptionStartedAt = new Date();
    const subscriptionExpiresAt = price?.durationDays
      ? new Date(
          subscriptionStartedAt.getTime() +
            price.durationDays * 24 * 60 * 60 * 1000,
        )
      : null;

    const randomPassword =
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).slice(-10);

    const user = await this.prismaService.user.create({
      data: {
        email,
        name,
        password: await hash(randomPassword),
        role: 'USER',
        isEmailVerified: true,
        lastLoginAt: subscriptionStartedAt,
        subscriptionPlanId: plan.id,
        subscriptionPriceId: price?.id,
        subscriptionStartedAt,
        subscriptionExpiresAt,
        tokensBalance: plan.tokensOnPurchase ?? 0,
      },
    });

    await this.accountService.create(
      { name: 'Default', currency: 'USD', icon: 'wallet' },
      user,
    );
    await this.categoryService.createDefault(user);

    return await this.prismaService.user.findUnique({
      where: { id: user.id },
      include: {
        accounts: true,
        tags: true,
        categories: {
          include: {
            children: true,
            keywords: true,
          },
        },
        subscriptionPlan: true,
      },
    });
  }

  public async findOne(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        subscriptionPrice: true,
        accounts: true,
        categories: true,
        aiTokenUsages: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new BadRequestException(AuthError.USER_NOT_FOUND);
    }

    return user;
  }

  public async update(input: UpdateUserInput) {
    const { id, ...data } = input;

    if (data.isActive === false) {
      const user = await this.prismaService.user.findUnique({ where: { id } });
      if (user?.role === Role.ADMIN) {
        throw new BadRequestException(AuthError.ADMIN_CANNOT_BE_DEACTIVATED);
      }
    }

    if (data.password) {
      data.password = await hash(data.password);
    }

    if (data.subscriptionPlanId) {
      const plan = await this.prismaService.subscriptionPlan.findUnique({
        where: { id: data.subscriptionPlanId },
        include: { prices: true },
      });
      if (!plan) {
        throw new BadRequestException(SubscriptionError.PLAN_NOT_FOUND);
      }

      if (data.subscriptionPriceId) {
        const price = plan.prices.find(
          (p) => p.id === data.subscriptionPriceId,
        );
        if (!price) {
          throw new BadRequestException(
            SubscriptionError.PRICE_DOES_NOT_BELONG_TO_PLAN,
          );
        }
      }
    }

    return this.prismaService.user.update({
      where: { id },
      data,
      include: {
        subscriptionPlan: true,
        subscriptionPrice: true,
      },
    });
  }

  public async remove(id: string) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (user?.role === Role.ADMIN) {
      throw new BadRequestException(AuthError.ADMIN_CANNOT_BE_DELETED);
    }

    return this.prismaService.user.delete({
      where: { id },
    });
  }
}
