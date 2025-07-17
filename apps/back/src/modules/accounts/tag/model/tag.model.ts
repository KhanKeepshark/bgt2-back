import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Tag } from '@prisma/generated';

@ObjectType()
export class TagModel implements Tag {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  color: string;

  @Field(() => String)
  userId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
