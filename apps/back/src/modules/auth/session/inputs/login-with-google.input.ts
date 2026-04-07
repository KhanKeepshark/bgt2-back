import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class LoginWithGoogleInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  token: string;
}
