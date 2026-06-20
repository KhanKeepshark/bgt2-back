import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsUUID, ValidateIf } from 'class-validator';

@InputType()
export class ResendVerificationInput {
  @Field(() => String, { nullable: true })
  @ValidateIf((input: ResendVerificationInput) => !input.token)
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((input: ResendVerificationInput) => !input.email)
  @IsUUID('4')
  token?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  language?: string;
}
