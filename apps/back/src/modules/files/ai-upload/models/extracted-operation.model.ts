import { ExtractedOperation } from '@back/shared/types/ai-operations';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ExtractedOperationModel implements ExtractedOperation {
  @Field(() => String)
  amount: string;

  @Field(() => String)
  date: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';

  @Field(() => String)
  categoryName: string;
}