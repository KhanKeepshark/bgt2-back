import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { PremiumPlan, User } from '@prisma/generated';

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

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Boolean)
  isEmailVerified: boolean;

  @Field(() => Boolean)
  isPremium: boolean;

  @Field(() => Date, { nullable: true })
  premiumExpiresAt: Date;

  @Field(() => String, { nullable: true })
  premiumPlan: PremiumPlan;

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
}
