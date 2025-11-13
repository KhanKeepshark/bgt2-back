import { Field, InputType } from '@nestjs/graphql';
import { CreateOperationInput } from './create-operation.input';

@InputType()
export class UpdateOperationInput extends CreateOperationInput {
  @Field(() => String)
  id: string;
}
