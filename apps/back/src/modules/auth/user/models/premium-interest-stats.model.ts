import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PremiumInterestStatsModel {
  @Field(() => Int)
  interestedCount: number;

  @Field(() => Int)
  totalUsers: number;
}
