import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationScope } from '@prisma/generated';
import { LocalizedStringModel } from './localized-string.model';

registerEnumType(NotificationScope, {
  name: 'NotificationScope',
  description: 'Scope of notification (GLOBAL or USER)',
});

@ObjectType()
export class NotificationModel {
  @Field(() => ID)
  id: string;

  @Field(() => LocalizedStringModel)
  title: LocalizedStringModel;

  @Field(() => LocalizedStringModel)
  description: LocalizedStringModel;

  @Field(() => String, { nullable: true })
  link: string | null;

  @Field(() => LocalizedStringModel)
  buttonText: LocalizedStringModel;

  @Field(() => NotificationScope)
  scope: NotificationScope;

  @Field(() => String, { nullable: true })
  userId: string | null;

  @Field(() => Boolean)
  isRead: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
