import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanResolver } from './subscription-plan.resolver';

@Module({
  providers: [SubscriptionPlanService, SubscriptionPlanResolver],
  exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}
