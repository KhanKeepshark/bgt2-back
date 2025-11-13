import { Field, ObjectType } from '@nestjs/graphql';
import { Decimal } from '@prisma/client/runtime/library';
import { CategoryModel } from '../../category/models/category.model';

@ObjectType()
export class DaySumModel {
  @Field(() => String)
  key: string;

  @Field(() => String)
  value: string;
}

@ObjectType()
export class AveragesDataModel {
  @Field(() => String)
  dayAverage: string;

  @Field(() => String, { nullable: true })
  weekAverage?: string;

  @Field(() => String, { nullable: true })
  monthAverage?: string;

  @Field(() => String, { nullable: true })
  yearAverage?: string;
}

@ObjectType()
export class Categories {
  @Field(() => CategoryModel)
  category: CategoryModel

  @Field(() => String)
  all: Decimal;

  @Field(() => String)
  percent: string;

  @Field(() => String, { nullable: true })
  changePercent?: string;
}

@ObjectType()
export class IncomeExpenseDataModel {
  @Field(() => String)
  all: Decimal;

  @Field(() => [DaySumModel])
  byDays: DaySumModel[];

  @Field(() => AveragesDataModel)
  averages: AveragesDataModel;

  @Field(() => [Categories])
  categories: Categories[];

  @Field(() => Number)
  groupSize: number;

  @Field(() => String, { nullable: true })
  changePercent?: string;
}

@ObjectType()
export class OperationChartDataModel {
  @Field(() => IncomeExpenseDataModel)
  income: IncomeExpenseDataModel;

  @Field(() => IncomeExpenseDataModel)
  expense: IncomeExpenseDataModel;
}

