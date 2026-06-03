import { Field, Int, ObjectType } from '@nestjs/graphql';
import { DailyCountModel } from './daily-count.model';

@ObjectType()
export class UserStatsModel {
  @Field(() => Int)
  totalOperations: number;

  @Field(() => Int)
  aiImportCount: number;

  @Field(() => Int)
  exportCount: number;

  @Field(() => Int)
  categoryKeywordCount: number;

  @Field(() => [DailyCountModel])
  operationsDaily: DailyCountModel[];
}
