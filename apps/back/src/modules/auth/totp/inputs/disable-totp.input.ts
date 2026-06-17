import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, Length } from 'class-validator';

@InputType()
export class DisableTotpInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  pin: string;
}
