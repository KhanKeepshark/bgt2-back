import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { KeywordFilterType } from '@prisma/generated';

@InputType()
export class CreateKeywordFilterInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  phrase: string;

  @Field(() => KeywordFilterType)
  @IsEnum(KeywordFilterType)
  type: KeywordFilterType;
}
