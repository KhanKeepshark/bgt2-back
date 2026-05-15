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
import { ChangePasswordInput } from './inputs/change-password.input';
import { UserWhereInput } from './inputs/user-where.input';
import { UserOrderByInput } from './inputs/user-order-by.input';
import { hash, verify } from 'argon2';
import { VerificationService } from '../verification/verification.service';
import { AccountService } from '../../accounts/account/account.service';
import { CategoryService } from '../../accounts/category/category.service';
import { MailService } from '../../libs/mail/mail.service';
import { generateToken } from '@back/shared/utils/generate-token.util';
import { TokenType } from '@prisma/generated';
import { ResetPasswordInput } from './inputs/reset-password.input';

@Injectable()
export class UserService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly accountService: AccountService,
    private readonly categoryService: CategoryService,
    private readonly verificationService: VerificationService,
    private readonly mailService: MailService,
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
    await this.categoryService.createDefault(user, language);

    await this.verificationService.sendVerificationEmail(user, language);

    return true;
  }

  public async createFromGoogle(
    email: string,
    name: string,
    language?: string,
  ) {
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
    await this.categoryService.createDefault(user, language);

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

  public async changePassword(id: string, input: ChangePasswordInput) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException(AuthError.USER_NOT_FOUND);
    }

    if (!user.password) {
      throw new BadRequestException(AuthError.INVALID_PASSWORD);
    }

    const isPasswordValid = await verify(user.password, input.oldPassword);
    if (!isPasswordValid) {
      throw new BadRequestException(AuthError.INVALID_PASSWORD);
    }

    const hashedPassword = await hash(input.newPassword);

    return this.prismaService.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  public async sendPasswordResetEmail(id: string, language?: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException(AuthError.USER_NOT_FOUND);
    }

    const resetToken = await generateToken(
      this.prismaService,
      TokenType.PASSWORD_RESET,
      user,
      true,
    );

    await this.mailService.sendPasswordResetEmail(
      user.email,
      resetToken.token,
      language,
    );

    return true;
  }

  public async forgotPassword(email: string, language?: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      return true;
    }

    const resetToken = await generateToken(
      this.prismaService,
      TokenType.PASSWORD_RESET,
      user,
      true,
    );

    await this.mailService.sendPasswordResetEmail(
      user.email,
      resetToken.token,
      language,
    );

    return true;
  }

  public async resetPassword(input: ResetPasswordInput) {
    const { token, newPassword } = input;

    const existingToken = await this.prismaService.token.findUnique({
      where: { token, type: TokenType.PASSWORD_RESET },
    });

    if (!existingToken) {
      throw new BadRequestException(AuthError.TOKEN_NOT_FOUND);
    }

    const hasExpired = new Date(existingToken.expiresAt) < new Date();

    if (hasExpired) {
      throw new BadRequestException(AuthError.TOKEN_EXPIRED);
    }

    const hashedPassword = await hash(newPassword);

    await this.prismaService.user.update({
      where: { id: existingToken.userId },
      data: { password: hashedPassword },
    });

    await this.prismaService.token.delete({
      where: { id: existingToken.id, type: TokenType.PASSWORD_RESET },
    });

    return true;
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
