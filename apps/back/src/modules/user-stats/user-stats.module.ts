import { Module } from '@nestjs/common';
import { PrismaModule } from '@back/core/prisma/prisma.module';
import { UserStatsService } from './user-stats.service';
import { UserStatsResolver } from './user-stats.resolver';
import { UserActivityService } from './user-activity.service';

@Module({
  imports: [PrismaModule],
  providers: [UserStatsService, UserStatsResolver, UserActivityService],
  exports: [UserActivityService],
})
export class UserStatsModule {}
