import { Field, ObjectType } from '@nestjs/graphql';
import { SystemMetricModel } from './system-metric.model';

@ObjectType()
export class PaginatedSystemMetricsModel {
  @Field(() => [SystemMetricModel])
  items: SystemMetricModel[];

  @Field(() => Number)
  total: number;
}
