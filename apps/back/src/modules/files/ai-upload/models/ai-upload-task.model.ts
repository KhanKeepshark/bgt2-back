import { Field, ObjectType } from '@nestjs/graphql';
import { ExtractedOperationModel } from './extracted-operation.model';
import { ExtractedOperation } from '@back/shared/types/ai-operations';

@ObjectType()
export class AiUploadTaskModel {
  @Field(() => String)
  taskId: string;

  @Field(() => String)
  status: string;

  @Field(() => [ExtractedOperationModel], { nullable: true })
  operations?: ExtractedOperation[];

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Number, { nullable: true })
  tokensBalance?: number;
}
