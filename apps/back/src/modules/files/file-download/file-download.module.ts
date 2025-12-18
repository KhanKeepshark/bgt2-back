import { Module } from '@nestjs/common';
import { FileDownloadService } from './file-download.service';
import { FileDownloadResolver } from './file-download.resolver';
import { OperationModule } from '@back/modules/accounts/operation/operation.module';

@Module({
  imports: [OperationModule],
  providers: [FileDownloadResolver, FileDownloadService],
})
export class FileDownloadModule {}
