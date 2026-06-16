import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class AcceptLegalDocumentsInput {
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
