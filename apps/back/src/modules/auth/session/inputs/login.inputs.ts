import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, Length, MinLength, ValidateIf } from 'class-validator';
import { IsString } from 'class-validator';

@InputType()
export class LoginInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  login: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((obj) => obj.pin !== undefined)
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  pin?: string;
}
