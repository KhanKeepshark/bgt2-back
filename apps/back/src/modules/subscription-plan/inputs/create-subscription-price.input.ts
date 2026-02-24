import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateSubscriptionPriceInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  price: string; // Decimal

  @Field(() => String, { defaultValue: 'USD' })
  currency: string;

  @Field(() => Int, { nullable: true })
  durationDays?: number | null;
}
