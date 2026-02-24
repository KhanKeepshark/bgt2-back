import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UsersByPlanItem {
  @Field(() => String)
  planName: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class SystemMetricModel {
  @Field(() => ID)
  id: string;

  @Field(() => Date)
  date: Date;

  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  activeUsersDaily: number;

  @Field(() => Int)
  activeUsersMonthly: number;

  @Field(() => [UsersByPlanItem])
  usersByPlan: UsersByPlanItem[];

  @Field(() => Int)
  totalOperations: number;

  @Field(() => Int)
  operationsCreatedDaily: number;

  @Field(() => Int)
  totalAiTokensUsed: number;

  @Field(() => Int)
  aiTokensUsedDaily: number;

  @Field(() => Date)
  createdAt: Date;
}
