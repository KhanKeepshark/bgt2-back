import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

@InputType()
export class AcceptLegalDocumentsInput {
  @Field(() => String, { nullable: true })
  @ValidateIf((input: AcceptLegalDocumentsInput) => !input.aiImportVersion)
  @IsNotEmpty()
  @IsString()
  termsVersion?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((input: AcceptLegalDocumentsInput) => !input.aiImportVersion)
  @IsNotEmpty()
  @IsString()
  privacyVersion?: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((input: AcceptLegalDocumentsInput) => !input.aiImportVersion)
  @IsNotEmpty()
  @IsString()
  crossBorderVersion?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  aiImportVersion?: string;
}
