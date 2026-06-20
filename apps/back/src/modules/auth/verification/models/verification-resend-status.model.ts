import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VerificationResendStatus {
  @Field(() => Boolean)
  canResend: boolean;

  @Field(() => Date, { nullable: true })
  nextResendAt?: Date | null;

  @Field(() => Boolean)
  tokenExpired: boolean;
}
