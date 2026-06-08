import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { FileDownloadService } from './file-download.service';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { OperationsExportFilterInput } from './inputs/operations-export-filter.input';
import { FileDownloadModel } from './models/file-download.model';

@Resolver('FileDownload')
export class FileDownloadResolver {
  constructor(private readonly fileDownloadService: FileDownloadService) {}

  @Authorization()
  @Mutation(() => FileDownloadModel, { name: 'exportOperationsToExcel' })
  public async exportOperationsToExcel(
    @Authorized() user: User,
    @Args('filter', { nullable: true }) filter?: OperationsExportFilterInput,
  ): Promise<FileDownloadModel> {
    return this.fileDownloadService.exportOperationsToExcel(user, filter || {});
  }

  @Authorization()
  @Mutation(() => FileDownloadModel, {
    name: 'exportArchivedOperationsToExcel',
  })
  public async exportArchivedOperationsToExcel(
    @Authorized() user: User,
  ): Promise<FileDownloadModel> {
    return this.fileDownloadService.exportArchivedOperationsToExcel(user);
  }
}
