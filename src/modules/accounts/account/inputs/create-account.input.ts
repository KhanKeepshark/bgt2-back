// create-account.input.ts
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateAccountInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  currency: string;

  @Field(() => Number, { nullable: true })
  @IsNumber()
  @IsOptional()
  balance?: number;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  icon?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  iconColor?: string;
}
