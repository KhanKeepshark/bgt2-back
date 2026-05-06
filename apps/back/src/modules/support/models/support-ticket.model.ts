import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { SupportTicketStatus } from '@prisma/generated';

registerEnumType(SupportTicketStatus, {
  name: 'SupportTicketStatus',
});

@ObjectType()
export class SupportTicket {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  replyMessage?: string | null;

  @Field(() => SupportTicketStatus)
  status: SupportTicketStatus;

  @Field(() => String, { nullable: true })
  userId?: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
