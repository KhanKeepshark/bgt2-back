import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DbRestoreJobModel {
  @Field(() => ID)
  id: string;

  @Field()
  status: string;

  @Field()
  filename: string;

  @Field()
  targetDatabase: string;

  @Field()
  startedAt: Date;

  @Field({ nullable: true })
  finishedAt?: Date;

  @Field({ nullable: true })
  errorMessage?: string;

  @Field({ nullable: true })
  logTail?: string;
}
