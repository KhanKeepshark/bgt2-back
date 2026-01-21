import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OperationType } from '@prisma/generated';

@InputType()
export class ExtractedOperationInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
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
