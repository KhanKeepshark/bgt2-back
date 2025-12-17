import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { SubscriptionPlan, User } from '@prisma/generated';

@ObjectType()
export class SubscriptionPlanModel implements SubscriptionPlan {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => Number, { nullable: true })
  tokensPerMonth: number | null;

  @Field(() => Number)
  tokensOnPurchase: number;

  @Field(() => String, { nullable: true })
  price: any;

  @Field(() => String)
  currency: string;

  @Field(() => Number, { nullable: true })
  durationDays: number | null;

  features: any;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Boolean)
  isDefault: boolean;

  users?: User[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
