import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { PaginatedSystemMetricsModel } from './models/paginated-system-metrics.model';
import { SystemMetricService } from './system-metric.service';
import { AdminOnly } from '@back/shared/decorators/auth.decorator';

@Resolver(() => PaginatedSystemMetricsModel)
export class SystemMetricResolver {
  constructor(private readonly systemMetricService: SystemMetricService) {}

  @Query(() => PaginatedSystemMetricsModel, { name: 'systemMetrics' })
  @AdminOnly()
  public async getSystemMetrics(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 })
    page: number,
    @Args('items', { type: () => Int, nullable: true, defaultValue: 30 })
    items: number,
  ) {
    return this.systemMetricService.findAll(page, items);
  }
}
