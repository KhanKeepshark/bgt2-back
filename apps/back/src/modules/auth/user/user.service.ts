import { PrismaService } from '@back/core/prisma/prisma.service';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CreateUserInput } from './inputs/create-user.input';
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

  public async findAll() {
    const users = await this.prismaService.user.findMany({
      include: {
        subscriptionPlan: true,
      },
    });

    return users;
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
}
