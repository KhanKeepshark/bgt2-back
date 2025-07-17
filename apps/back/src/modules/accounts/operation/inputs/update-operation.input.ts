import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateOperationInput } from './create-operation.input';

@InputType()
export class UpdateOperationInput extends PartialType(CreateOperationInput) {
  @Field(() => String)
  id: string;
}
