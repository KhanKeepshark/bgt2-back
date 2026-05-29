import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class LoginInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  login: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  password: string;
}
