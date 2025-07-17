import { Field, InputType } from '@nestjs/graphql';
import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateTagInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;
}
