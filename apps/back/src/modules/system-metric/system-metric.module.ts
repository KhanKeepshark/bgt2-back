import { Module } from '@nestjs/common';
import { SystemMetricService } from './system-metric.service';
import { SystemMetricResolver } from './system-metric.resolver';
import { PrismaModule } from '@back/core/prisma/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, AnalyticsModule],
  providers: [SystemMetricService, SystemMetricResolver],
  exports: [SystemMetricService],
})
export class SystemMetricModule {}
