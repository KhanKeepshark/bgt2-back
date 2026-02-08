import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateSubscriptionPlanInput {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  tokensPerMonth?: number | null;

  @Field(() => Int, { defaultValue: 0 })
  tokensOnPurchase: number;

  @Field(() => String, { nullable: true }) // Decimal passed as string
  price?: string | null;

  @Field(() => String, { defaultValue: 'USD' })
  currency: string;

  @Field(() => Int, { nullable: true })
  durationDays?: number | null;

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
  canUseAiOperations: boolean;

  @Field(() => Boolean, { defaultValue: false })
  canExportData: boolean;

  @Field(() => Boolean, { defaultValue: false })
  canUseRecurring: boolean;

  @Field(() => Boolean, { defaultValue: true })
  isActive: boolean;
}
