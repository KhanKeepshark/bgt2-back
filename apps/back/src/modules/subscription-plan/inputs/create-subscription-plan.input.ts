import { Field, InputType, Int } from '@nestjs/graphql';
import { SubscriptionType } from '@prisma/generated';
import { CreateSubscriptionPriceInput } from './create-subscription-price.input';

@InputType()
export class CreateSubscriptionPlanInput {
  @Field(() => SubscriptionType)
  type: SubscriptionType;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  tokensPerMonth?: number | null;

  @Field(() => Int, { defaultValue: 0 })
  tokensOnPurchase: number;

  @Field(() => Int, { nullable: true })
  maxOperations?: number | null;

  @Field(() => Int, { nullable: true })
  maxCategories?: number | null;

  @Field(() => Int, { nullable: true })
  maxAccounts?: number | null;

  @Field(() => Int, { nullable: true })
  maxTags?: number | null;

  @Field(() => Int, { nullable: true })
  maxRecurrenceConfigs?: number | null;

  @Field(() => Int, { nullable: true })
  maxOperationsPerMonth?: number | null;

  @Field(() => Int, { nullable: true })
  maxCategoryKeywordsPerCategory?: number | null;

  @Field(() => Boolean, { defaultValue: false })
  canExportData: boolean;

  @Field(() => Boolean, { defaultValue: false })
  canUseAutoCategory: boolean;

  @Field(() => Boolean, { defaultValue: true })
  isActive: boolean;

  @Field(() => [CreateSubscriptionPriceInput], { nullable: true })
  prices?: CreateSubscriptionPriceInput[];
}
