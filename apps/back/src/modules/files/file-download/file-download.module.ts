import { Module } from '@nestjs/common';
import { FileDownloadService } from './file-download.service';
import { FileDownloadResolver } from './file-download.resolver';
import { OperationModule } from '@back/modules/accounts/operation/operation.module';
import { UserStatsModule } from '@back/modules/user-stats/user-stats.module';

@Module({
  imports: [OperationModule, UserStatsModule],
  providers: [FileDownloadResolver, FileDownloadService],
})
export class FileDownloadModule {}
