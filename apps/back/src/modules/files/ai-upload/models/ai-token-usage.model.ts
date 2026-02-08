import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AiUsageStatus } from '@prisma/generated';

registerEnumType(AiUsageStatus, {
  name: 'AiUsageStatus',
});

@ObjectType()
export class AiTokenUsageModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => Number)
  estimatedTokens: number;

  @Field(() => Number)
  actualTokens: number;

  @Field(() => Number)
  operationsCreated: number;

  @Field(() => String, { nullable: true })
  fileType: string | null;

  @Field(() => AiUsageStatus)
  status: AiUsageStatus;

  @Field(() => String, { nullable: true })
  error: string | null;

  @Field(() => Date)
  createdAt: Date;
}
