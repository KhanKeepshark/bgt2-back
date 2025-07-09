import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Decimal } from '@prisma/client/runtime/library';
import type { Account } from '@prisma/generated';

@ObjectType()
export class AccountModel implements Account {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  balance: Decimal;

  @Field(() => String)
  currency: string;

  @Field(() => String)
  icon: string;

  @Field(() => String)
  iconColor: string;

  @Field(() => String)
  userId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
