// create-account.input.ts
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateAccountInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  currency: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  balance?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  icon?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  iconColor?: string;
}
