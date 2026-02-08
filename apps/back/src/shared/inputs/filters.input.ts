import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsArray, IsBoolean, IsInt, IsDate } from 'class-validator';

@InputType()
export class StringFilter {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  equals?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contains?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  startsWith?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  endsWith?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  in?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notIn?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  mode?: 'default' | 'insensitive';
}

@InputType()
export class IntFilter {
  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  equals?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  lt?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  lte?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  gt?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  gte?: number;

  @Field(() => [IntFilter], { nullable: true })
  @IsOptional()
  @IsArray()
  in?: number[];
}

@InputType()
export class BooleanFilter {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  equals?: boolean;
}

@InputType()
export class DateFilter {
  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  equals?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  lt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  lte?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  gt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  gte?: Date;
}
