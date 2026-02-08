import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Notification, NotificationScope } from '@prisma/generated';

registerEnumType(NotificationScope, {
  name: 'NotificationScope',
  description: 'Scope of notification (GLOBAL or USER)',
});

@ObjectType()
export class NotificationModel implements Notification {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => String, { nullable: true })
  link: string | null;

  @Field(() => String)
  buttonText: string;

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
