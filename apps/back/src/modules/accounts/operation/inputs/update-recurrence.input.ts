import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurrenceConfigInput } from './recurrence-config.input';

@InputType()
export class UpdateRecurrenceInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  id: string;

  @Field(() => RecurrenceConfigInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceConfigInput)
  recurrence?: RecurrenceConfigInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  amount?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  accountId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  transferAccountId?: string;
}
