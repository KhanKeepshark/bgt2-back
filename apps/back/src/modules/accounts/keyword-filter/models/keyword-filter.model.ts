import { KeywordFilter, KeywordFilterType } from '@prisma/generated';
import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';

registerEnumType(KeywordFilterType, {
  name: 'KeywordFilterType',
  description: 'Type of keyword filter (IGNORE or DELETE)',
});

@ObjectType()
export class KeywordFilterModel implements KeywordFilter {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  phrase: string;

  @Field(() => KeywordFilterType)
  type: KeywordFilterType;

  @Field(() => String)
  userId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
