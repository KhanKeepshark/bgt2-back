import { Field, ObjectType } from '@nestjs/graphql';
import { OperationModel } from './operation.model';

@ObjectType()
export class OperationDayGroupModel {
  @Field(() => String)
  day: string;

  @Field(() => [OperationModel])
  operations: OperationModel[];
}
