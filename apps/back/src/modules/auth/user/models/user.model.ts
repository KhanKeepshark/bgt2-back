import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { User } from '@prisma/generated';
import { AccountModel } from '../../../accounts/account/models/account.model';
import { TagModel } from '../../../accounts/tag/model/tag.model';
import { CategoryModel } from '../../../accounts/category/models/category.model';
import { SubscriptionPlanModel } from '../../../subscription-plan/models/subscription-plan.model';
import { SubscriptionPriceModel } from '../../../subscription-plan/models/subscription-price.model';
import { AiTokenUsageModel } from '../../../files/ai-upload/models/ai-token-usage.model';

@ObjectType()
export class UserModel implements User {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  password: string;

  @Field(() => String, { nullable: true })
  defaultAccountId: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Boolean)
  isEmailVerified: boolean;

  @Field(() => String)
  subscriptionPlanId: string;

  @Field(() => String, { nullable: true })
  subscriptionPriceId: string | null;

  @Field(() => Date)
  subscriptionStartedAt: Date;

  @Field(() => Date, { nullable: true })
  subscriptionExpiresAt: Date;

  @Field(() => Boolean)
  subscriptionAutoRenew: boolean;

  @Field(() => Number)
  tokensBalance: number;

  @Field(() => Boolean)
  isTotpEnabled: boolean;

  @Field(() => String, { nullable: true })
  totpSecret: string;

  @Field(() => Date, { nullable: true })
  lastLoginAt: Date;

  @Field(() => Number)
  loginCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  role: 'USER' | 'ADMIN';

  @Field(() => Date, { nullable: true })
  welcomeSheetSeenAt: Date | null;

  @Field(() => Date, { nullable: true })
  operationsArchivalNotifiedAt: Date | null;

  @Field(() => SubscriptionPlanModel)
  subscriptionPlan: SubscriptionPlanModel;

  @Field(() => SubscriptionPriceModel, { nullable: true })
  subscriptionPrice?: SubscriptionPriceModel;

  @Field(() => [AccountModel], { nullable: true })
  accounts?: AccountModel[];

  @Field(() => [TagModel], { nullable: true })
  tags?: TagModel[];

  @Field(() => [CategoryModel], { nullable: true })
  categories?: CategoryModel[];

  @Field(() => [AiTokenUsageModel], { nullable: true })
  aiTokenUsages?: AiTokenUsageModel[];
}
