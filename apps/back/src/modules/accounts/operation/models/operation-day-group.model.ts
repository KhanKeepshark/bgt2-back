import { Field, ObjectType } from '@nestjs/graphql';
import { Decimal } from '@prisma/client/runtime/library';
import { OperationModel } from './operation.model';

@ObjectType()
export class OperationDayGroupModel {
  @Field(() => String)
  day: string;

  @Field(() => String)
  allIncome: Decimal;

  @Field(() => String)
  allExpense: Decimal;

  @Field(() => [OperationModel])
  operations: OperationModel[];
}
