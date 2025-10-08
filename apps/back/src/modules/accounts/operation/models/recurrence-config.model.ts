import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  RecurrenceConfig,
  RecurrenceFrequency,
  OperationType,
} from '@prisma/generated';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountModel } from '../../account/models/account.model';
import { CategoryModel } from '../../category/models/category.model';
import { OperationModel } from './operation.model';

registerEnumType(RecurrenceFrequency, {
  name: 'RecurrenceFrequency',
  description: 'Frequency of recurrence',
});

@ObjectType()
export class RecurrenceConfigModel implements RecurrenceConfig {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  frequency: RecurrenceFrequency;

  @Field(() => Int)
  interval: number;

  @Field(() => [Int])
  weekDays: number[];

  @Field(() => Date)
  date: Date;

  @Field(() => String)
  amount: Decimal;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String)
  type: OperationType;

  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  accountId: string | null;

  @Field(() => String, { nullable: true })
  transferAccountId: string | null;

  @Field(() => String, { nullable: true })
  categoryId: string | null;

  @Field(() => AccountModel, { nullable: true })
  account?: AccountModel | null;

  @Field(() => AccountModel, { nullable: true })
  transferAccount?: AccountModel | null;

  @Field(() => CategoryModel, { nullable: true })
  category?: CategoryModel | null;

  @Field(() => [OperationModel], { nullable: true })
  operations?: OperationModel[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
