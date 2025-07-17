import { Category, CategoryType } from '@prisma/generated';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CategoryModel implements Category {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => CategoryType)
  type: CategoryType;

  @Field(() => String)
  color: string;

  @Field(() => String)
  icon: string;

  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  parentId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [CategoryModel], { nullable: true })
  children: CategoryModel[];
}
