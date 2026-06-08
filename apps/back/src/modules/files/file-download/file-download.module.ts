import { Module } from '@nestjs/common';
import { FileDownloadService } from './file-download.service';
import { FileDownloadResolver } from './file-download.resolver';
import { OperationModule } from '@back/modules/accounts/operation/operation.module';
import { UserStatsModule } from '@back/modules/user-stats/user-stats.module';
import { PrismaModule } from '@back/core/prisma/prisma.module';

@Module({
  imports: [OperationModule, UserStatsModule, PrismaModule],
  providers: [FileDownloadResolver, FileDownloadService],
})
export class FileDownloadModule {}
