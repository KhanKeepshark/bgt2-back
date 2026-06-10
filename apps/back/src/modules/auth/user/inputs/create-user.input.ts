import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  language?: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  termsVersion: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  privacyVersion: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  crossBorderVersion: string;
}
