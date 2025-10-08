import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Decimal } from '@prisma/client/runtime/library';
import { Operation, OperationType, RecurrenceConfig } from '@prisma/generated';
import { CategoryModel } from '../../category/models/category.model';
import { AccountModel } from '../../account/models/account.model';
import { TagModel } from '../../tag/model/tag.model';
import { RecurrenceConfigModel } from './recurrence-config.model';

registerEnumType(OperationType, {
  name: 'OperationType',
  description: 'Type of operation',
});

@ObjectType()
export class OperationModel implements Operation {
  @Field(() => String)
  id: string;

  @Field(() => String)
  amount: Decimal;

  @Field(() => Date)
  date: Date;

  @Field(() => String)
  description: string;

  @Field(() => String)
  type: OperationType;

  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  categoryId: string;

  @Field(() => String)
  accountId: string;

  @Field(() => String, { nullable: true })
  transferAccountId: string;

  @Field(() => String, { nullable: true })
  recurrenceConfigId: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => CategoryModel, { nullable: true })
  category?: CategoryModel | null;

  @Field(() => AccountModel)
  account: AccountModel;

  @Field(() => AccountModel, { nullable: true })
  transferAccount?: AccountModel | null;

  @Field(() => [TagModel], { nullable: true })
  tags?: TagModel[] | null;

  @Field(() => RecurrenceConfigModel, { nullable: true })
  recurrenceConfig?: RecurrenceConfig | null;
}
