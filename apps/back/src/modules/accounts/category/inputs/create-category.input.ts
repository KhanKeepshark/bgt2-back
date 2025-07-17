import { CategoryType } from '@prisma/generated';
import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import {
  IsEnum,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

registerEnumType(CategoryType, {
  name: 'CategoryType',
  description: 'Type of category',
});

@InputType()
export class CreateCategoryInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => CategoryType)
  @IsEnum(CategoryType)
  type: CategoryType;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  icon?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  parentId?: string;
}
