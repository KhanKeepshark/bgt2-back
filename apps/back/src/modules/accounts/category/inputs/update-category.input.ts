import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateCategoryInput } from './create-category.input';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class UpdateCategoryInput extends PartialType(CreateCategoryInput) {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  id: string;
}
