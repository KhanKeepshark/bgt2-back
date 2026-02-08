import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { CreateSubscriptionPlanInput } from './inputs/create-subscription-plan.input';
import { UpdateSubscriptionPlanInput } from './inputs/update-subscription-plan.input';

@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly prismaService: PrismaService) {}

  public async findAll() {
    return this.prismaService.subscriptionPlan.findMany({
      orderBy: {
        price: 'asc',
      },
    });
  }

  public async findOne(id: string) {
    const plan = await this.prismaService.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`);
    }

    return plan;
  }

  public async create(input: CreateSubscriptionPlanInput) {
    const existing = await this.prismaService.subscriptionPlan.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictException(`Subscription plan with name "${input.name}" already exists`);
    }

    return this.prismaService.subscriptionPlan.create({
      data: input,
    });
  }

  public async update(input: UpdateSubscriptionPlanInput) {
    const { id, ...data } = input;

    await this.findOne(id); // Ensure exists

    if (data.name) {
      const existing = await this.prismaService.subscriptionPlan.findUnique({
        where: { name: data.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Subscription plan with name "${data.name}" already exists`);
      }
    }

    return this.prismaService.subscriptionPlan.update({
      where: { id },
      data,
    });
  }

  public async remove(id: string) {
    await this.findOne(id); // Ensure exists

    // Check if used by any user
    const usersCount = await this.prismaService.user.count({
      where: { subscriptionPlanId: id },
    });

    if (usersCount > 0) {
      throw new ConflictException(`Cannot delete subscription plan because it is assigned to ${usersCount} users`);
    }

    return this.prismaService.subscriptionPlan.delete({
      where: { id },
    });
  }
}
