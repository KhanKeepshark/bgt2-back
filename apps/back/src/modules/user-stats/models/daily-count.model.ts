import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DailyCountModel {
  @Field(() => String)
  date: string;

  @Field(() => Int)
  count: number;
}
