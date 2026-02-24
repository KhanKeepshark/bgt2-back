import { Module } from '@nestjs/common';
import { SystemMetricService } from './system-metric.service';
import { SystemMetricResolver } from './system-metric.resolver';
import { PrismaModule } from '@back/core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SystemMetricService, SystemMetricResolver],
  exports: [SystemMetricService],
})
export class SystemMetricModule {}
