import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaymentStatus } from '@prisma/generated';
import { Decimal } from '@prisma/client/runtime/library';

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
});

@ObjectType()
export class PaymentModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  amount: Decimal;

  @Field(() => String)
  currency: string;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field(() => String, { nullable: true })
  externalId: string | null;

  @Field(() => Date)
  createdAt: Date;
}
