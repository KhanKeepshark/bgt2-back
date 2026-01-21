import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

@InputType()
export class CreateCategoryKeywordInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  phrase: string;

  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}

