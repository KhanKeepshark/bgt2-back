import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => String)
  id: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;

  @Field(() => String, { nullable: true })
  role?: 'USER' | 'ADMIN';

  @Field(() => Number, { nullable: true })
  tokensBalance?: number;

  @Field(() => String, { nullable: true })
  subscriptionPlanId?: string;

  @Field(() => String, { nullable: true })
  subscriptionPriceId?: string;

  @Field(() => Boolean, { nullable: true })
  isEmailVerified?: boolean;
}
