import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { SubscriptionType } from '@prisma/generated';
import type { SubscriptionPlan, User } from '@prisma/generated';
import { SubscriptionPriceModel } from './subscription-price.model';

registerEnumType(SubscriptionType, {
  name: 'SubscriptionType',
});

@ObjectType()
export class SubscriptionPlanModel implements SubscriptionPlan {
  @Field(() => ID)
  id: string;

  @Field(() => SubscriptionType)
  type: SubscriptionType;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => Number, { nullable: true })
  tokensPerMonth: number | null;

  @Field(() => Number)
  tokensOnPurchase: number;

  @Field(() => Number, { nullable: true })
  maxCategories: number | null;

  @Field(() => Number, { nullable: true })
  maxAccounts: number | null;

  @Field(() => Number, { nullable: true })
  maxTags: number | null;

  @Field(() => Number, { nullable: true })
  maxRecurrenceConfigs: number | null;

  @Field(() => Number, { nullable: true })
  maxOperationsPerMonth: number | null;

  @Field(() => Number, { nullable: true })
  maxCategoryKeywordsPerCategory: number | null;

  @Field(() => Boolean)
  canExportData: boolean;

  @Field(() => Boolean)
  canUseAutoCategory: boolean;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => [SubscriptionPriceModel], { nullable: true })
  prices?: SubscriptionPriceModel[];

  users?: User[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
