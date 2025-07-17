import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateTagInput } from './create-tag.input';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class UpdateTagInput extends PartialType(CreateTagInput) {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  id: string;
}
