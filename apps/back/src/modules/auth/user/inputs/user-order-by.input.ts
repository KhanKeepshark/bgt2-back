import { Field, InputType } from '@nestjs/graphql';
import { SortOrder } from '@back/shared/inputs/sort.input';
import { IsOptional } from 'class-validator';

@InputType()
export class UserOrderByInput {
  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  createdAt?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  updatedAt?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  lastLoginAt?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  loginCount?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  email?: SortOrder;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  name?: SortOrder;
}
