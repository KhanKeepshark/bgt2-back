import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiCountModel {
  @Field(() => Number)
  tokenCount: number;
}
