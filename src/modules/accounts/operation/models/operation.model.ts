import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Decimal } from '@prisma/client/runtime/library';
import { Operation, OperationType } from '@prisma/generated';

registerEnumType(OperationType, {
  name: 'OperationType',
  description: 'Type of operation',
});

@ObjectType()
export class OperationModel implements Operation {
  @Field(() => String)
  id: string;

  @Field(() => String)
  amount: Decimal;

  @Field(() => Date)
  date: Date;

  @Field(() => String)
  description: string;

  @Field(() => String)
  type: OperationType;

  @Field(() => String, { nullable: true })
  categoryId: string;

  @Field(() => String)
  accountId: string;

  @Field(() => String, { nullable: true })
  transferAccountId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
