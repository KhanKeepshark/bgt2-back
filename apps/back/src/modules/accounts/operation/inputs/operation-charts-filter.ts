import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

@InputType()
export class OperationChartsFilterInput {
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  dateTo?: Date;

  @Field(() => String, { nullable: true })
  @ValidateIf((o) => o.dateFrom && o.dateTo)
  @IsNotEmpty()
  @IsString()
  type: 'week' | 'month' | 'year' | 'custom';

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  searchDescription?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];
}
