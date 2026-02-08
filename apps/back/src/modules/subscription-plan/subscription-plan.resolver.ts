import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanModel } from './models/subscription-plan.model';
import { CreateSubscriptionPlanInput } from './inputs/create-subscription-plan.input';
import { UpdateSubscriptionPlanInput } from './inputs/update-subscription-plan.input';
import { AdminOnly } from '@back/shared/decorators/auth.decorator';

@Resolver(() => SubscriptionPlanModel)
export class SubscriptionPlanResolver {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Query(() => [SubscriptionPlanModel], { name: 'findAllSubscriptionPlans' })
  @AdminOnly()
  public async findAll() {
    return this.subscriptionPlanService.findAll();
  }

  @Query(() => SubscriptionPlanModel, { name: 'findSubscriptionPlan' })
  @AdminOnly()
  public async findOne(@Args('id') id: string) {
    return this.subscriptionPlanService.findOne(id);
  }

  @Mutation(() => SubscriptionPlanModel, { name: 'createSubscriptionPlan' })
  @AdminOnly()
  public async create(@Args('data') input: CreateSubscriptionPlanInput) {
    return this.subscriptionPlanService.create(input);
  }

  @Mutation(() => SubscriptionPlanModel, { name: 'updateSubscriptionPlan' })
  @AdminOnly()
  public async update(@Args('data') input: UpdateSubscriptionPlanInput) {
    return this.subscriptionPlanService.update(input);
  }

  @Mutation(() => SubscriptionPlanModel, { name: 'removeSubscriptionPlan' })
  @AdminOnly()
  public async remove(@Args('id') id: string) {
    return this.subscriptionPlanService.remove(id);
  }
}
