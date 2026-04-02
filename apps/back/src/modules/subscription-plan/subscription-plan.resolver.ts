import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SubscriptionType } from '@prisma/generated';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanModel } from './models/subscription-plan.model';
import { UpdateSubscriptionPlanInput } from './inputs/update-subscription-plan.input';
import {
  AdminOnly,
  Authorization,
} from '@back/shared/decorators/auth.decorator';

@Resolver(() => SubscriptionPlanModel)
export class SubscriptionPlanResolver {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
  ) {}

  @Query(() => [SubscriptionPlanModel], { name: 'findAllSubscriptionPlans' })
  @Authorization()
  public async findAll(
    @Args('type', { type: () => SubscriptionType, nullable: true })
    type?: SubscriptionType,
  ) {
    return this.subscriptionPlanService.findAll(type);
  }

  @Query(() => SubscriptionPlanModel, { name: 'findSubscriptionPlan' })
  @AdminOnly()
  public async findOne(@Args('id') id: string) {
    return this.subscriptionPlanService.findOne(id);
  }

  @Mutation(() => SubscriptionPlanModel, { name: 'updateSubscriptionPlan' })
  @AdminOnly()
  public async update(@Args('data') input: UpdateSubscriptionPlanInput) {
    return this.subscriptionPlanService.update(input);
  }
}
