import { CategoryKeyword } from '@prisma/generated';
import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class CategoryKeywordModel implements CategoryKeyword {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  phrase: string;

  @Field(() => String)
  categoryId: string;

  @Field(() => String)
  userId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

