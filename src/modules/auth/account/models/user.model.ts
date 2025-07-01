import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import type { User } from '@prisma/generated';
export const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

registerEnumType(Role, {
  name: 'Role',
});

@ObjectType()
export class UserModel implements User {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  password: string;

  @Field(() => String, { nullable: true })
  avatar: string;

  @Field(() => Boolean)
  isTotpEnabled: boolean;

  @Field(() => String, { nullable: true })
  totpSecret: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Role)
  role: RoleType;
}
