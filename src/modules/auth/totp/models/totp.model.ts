import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TotpModel {
  @Field(() => String)
  secret: string;

  @Field(() => String)
  qrCodeUrl: string;
}
