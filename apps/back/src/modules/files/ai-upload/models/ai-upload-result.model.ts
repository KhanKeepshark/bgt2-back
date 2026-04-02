import { Field, ObjectType } from '@nestjs/graphql';
import { ExtractedOperation } from '@back/shared/types/ai-operations';
import { ExtractedOperationModel } from './extracted-operation.model';

@ObjectType()
export class AiUploadResultModel {
  @Field(() => [ExtractedOperationModel])
  operations: ExtractedOperation[];

  @Field(() => Number)
  tokensBalance: number;
}
