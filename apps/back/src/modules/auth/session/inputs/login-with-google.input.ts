import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class LoginWithGoogleInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  token: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  language?: string;
}
