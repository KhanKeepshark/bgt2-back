import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateNotificationInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  description: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @IsUrl()
  link?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  buttonText: string;
}
