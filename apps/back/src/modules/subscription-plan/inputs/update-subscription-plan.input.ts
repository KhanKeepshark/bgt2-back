import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateSubscriptionPlanInput } from './create-subscription-plan.input';

@InputType()
export class UpdateSubscriptionPlanInput extends PartialType(CreateSubscriptionPlanInput) {
  @Field(() => String)
  id: string;
}
