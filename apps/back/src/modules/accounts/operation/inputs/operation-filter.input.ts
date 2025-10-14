import { OperationType } from '@prisma/generated';
import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

@InputType()
export class OperationFilterInput {
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  dateTo?: Date;

  @Field(() => [OperationType], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(OperationType, { each: true })
  types?: OperationType[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  searchDescription?: string;
}
