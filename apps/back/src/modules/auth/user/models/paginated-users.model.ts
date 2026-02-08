import { Field, Int, ObjectType } from '@nestjs/graphql';
import { UserModel } from './user.model';

@ObjectType()
export class PaginatedUsersModel {
  @Field(() => [UserModel])
  items: UserModel[];

  @Field(() => Int)
  total: number;
}
