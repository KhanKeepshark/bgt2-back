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

  @Field(() => Number, { nullable: true })
  maxOperations: number | null;

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
  canUseAiOperations: boolean;

  @Field(() => Boolean)
  canExportData: boolean;

  @Field(() => Boolean)
  canUseRecurring: boolean;

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
