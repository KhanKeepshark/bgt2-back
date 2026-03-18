import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SubscriptionType } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { CreateSubscriptionPlanInput } from './inputs/create-subscription-plan.input';
import { UpdateSubscriptionPlanInput } from './inputs/update-subscription-plan.input';
import { SubscriptionError } from '@back/shared/constants/errors.constants';

@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findAll(type?: SubscriptionType) {
    return this.prismaService.subscriptionPlan.findMany({
      where: type ? { type } : undefined,
      include: {
        prices: true,
      },
      orderBy: {
        type: 'asc',
      },
    });
  }

  public async findOne(id: string) {
    const plan = await this.prismaService.subscriptionPlan.findUnique({
      where: { id },
      include: {
        prices: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(SubscriptionError.PLAN_NOT_FOUND);
    }

    return plan;
  }

  public async create(input: CreateSubscriptionPlanInput) {
    const existing = await this.prismaService.subscriptionPlan.findUnique({
      where: { type: input.type },
    });

    if (existing) {
      return this.update({
        ...input,
        id: existing.id,
      });
    }

    const { prices, ...data } = input;

    return this.prismaService.subscriptionPlan.create({
      data: {
        ...data,
        prices: prices ? {
          create: prices,
        } : undefined,
      },
      include: {
        prices: true,
      },
    });
  }

  public async update(input: UpdateSubscriptionPlanInput) {
    const { id, prices, ...data } = input;

    await this.findOne(id); // Ensure exists

    if (data.type) {
      const existing = await this.prismaService.subscriptionPlan.findUnique({
        where: { type: data.type },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(SubscriptionError.PLAN_ALREADY_EXISTS);
      }
    }

    // Update plan data
    await this.prismaService.subscriptionPlan.update({
      where: { id },
      data,
    });

    // Handle prices if provided
    if (prices) {
      for (const priceInput of prices) {
        // Try to find existing price by name for this plan
        const existingPrice = await this.prismaService.subscriptionPrice.findFirst({
          where: { planId: id, id: priceInput.id },
        });

        if (existingPrice) {
          await this.prismaService.subscriptionPrice.update({
            where: { id: existingPrice.id },
            data: priceInput,
          });
        } else {
          throw new NotFoundException(SubscriptionError.PRICE_NOT_FOUND);
        }
      }
    }

    return this.findOne(id);
  }

  public async remove(id: string) {
    await this.findOne(id); // Ensure exists

    // Check if used by any user
    const usersCount = await this.prismaService.user.count({
      where: { subscriptionPlanId: id },
    });

    if (usersCount > 0) {
      throw new ConflictException(SubscriptionError.CANNOT_DELETE_ASSIGNED_PLAN);
    }

    return this.prismaService.subscriptionPlan.delete({
      where: { id },
    });
  }
}
