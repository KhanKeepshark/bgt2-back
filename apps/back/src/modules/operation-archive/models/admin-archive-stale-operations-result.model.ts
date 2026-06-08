import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminArchiveStaleOperationsResultModel {
  @Field(() => Int)
  monthsProcessed: number;

  @Field(() => Int)
  usersArchived: number;

  @Field(() => Int)
  usersSkipped: number;

  @Field(() => [String])
  archivedMonths: string[];
}
