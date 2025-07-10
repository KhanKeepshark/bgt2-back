import { OperationType } from '@/prisma/generated';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateOperationInput {
  @Field(() => String)
  amount: string;

  @Field(() => Date)
  date: Date;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => OperationType)
  type: OperationType;

  @Field(() => String)
  categoryId: string;

  @Field(() => String)
  accountId: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}
