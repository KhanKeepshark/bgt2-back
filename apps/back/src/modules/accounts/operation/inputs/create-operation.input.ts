import { OperationType } from '@prisma/generated';
import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

registerEnumType(OperationType, {
  name: 'OperationType',
  description: 'Type of operation',
});

@InputType()
export class CreateOperationInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  amount: string;

  @Field(() => Date)
  @IsNotEmpty()
  @IsDate()
  date: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => OperationType)
  @IsNotEmpty()
  @IsEnum(OperationType)
  type: OperationType;

  @Field(() => String, { nullable: true })
  @ValidateIf((o) => o.type !== OperationType.TRANSFER)
  @IsNotEmpty()
  @IsString()
  categoryId?: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  accountId: string;

  @Field(() => String, { nullable: true })
  @ValidateIf((o) => o.type === OperationType.TRANSFER)
  @IsNotEmpty()
  @IsString()
  transferAccountId?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
