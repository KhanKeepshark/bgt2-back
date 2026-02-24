import { Field, ID, ObjectType, Int } from '@nestjs/graphql';
import { Decimal } from '@prisma/client/runtime/library';
import type { SubscriptionPrice } from '@prisma/generated';

@ObjectType()
export class SubscriptionPriceModel implements SubscriptionPrice {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  planId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  price: Decimal;

  @Field(() => String)
  currency: string;

  @Field(() => Int, { nullable: true })
  durationDays: number | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
