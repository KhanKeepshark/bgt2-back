import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LocalizedStringModel {
  @Field(() => String, { nullable: true })
  en: string | null;

  @Field(() => String, { nullable: true })
  ru: string | null;

  @Field(() => String, { nullable: true })
  kz: string | null;
}
