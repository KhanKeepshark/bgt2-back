import { Field, InputType } from '@nestjs/graphql';
import {
  StringFilter,
  BooleanFilter,
  IntFilter,
  DateFilter,
} from '@back/shared/inputs/filters.input';
import { IsOptional } from 'class-validator';

@InputType()
export class UserWhereInput {
  @Field(() => StringFilter, { nullable: true })
  @IsOptional()
  id?: StringFilter;

  @Field(() => StringFilter, { nullable: true })
  @IsOptional()
  email?: StringFilter;

  @Field(() => StringFilter, { nullable: true })
  @IsOptional()
  name?: StringFilter;

  @Field(() => StringFilter, { nullable: true })
  @IsOptional()
  role?: StringFilter; // Can be enhanced to be Enum specific if needed

  @Field(() => BooleanFilter, { nullable: true })
  @IsOptional()
  isActive?: BooleanFilter;

  @Field(() => BooleanFilter, { nullable: true })
  @IsOptional()
  isEmailVerified?: BooleanFilter;

  @Field(() => DateFilter, { nullable: true })
  @IsOptional()
  createdAt?: DateFilter;

  @Field(() => DateFilter, { nullable: true })
  @IsOptional()
  updatedAt?: DateFilter;

  @Field(() => DateFilter, { nullable: true })
  @IsOptional()
  lastLoginAt?: DateFilter;

  @Field(() => IntFilter, { nullable: true })
  @IsOptional()
  loginCount?: IntFilter;

  @Field(() => [UserWhereInput], { nullable: true })
  @IsOptional()
  AND?: UserWhereInput[];

  @Field(() => [UserWhereInput], { nullable: true })
  @IsOptional()
  OR?: UserWhereInput[];

  @Field(() => [UserWhereInput], { nullable: true })
  @IsOptional()
  NOT?: UserWhereInput[];
}
