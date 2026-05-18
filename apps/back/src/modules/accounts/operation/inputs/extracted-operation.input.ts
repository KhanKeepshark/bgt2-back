import { InputType, Field } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { OperationType } from '@prisma/generated';

@InputType()
export class ExtractedOperationInput {
  @Field(() => String)
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'Amount must be a valid positive number',
  })
  amount: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  date: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => OperationType)
  @IsNotEmpty()
  @IsEnum(OperationType)
  type: OperationType;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  categoryName: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  containsKeyword?: boolean;
}
