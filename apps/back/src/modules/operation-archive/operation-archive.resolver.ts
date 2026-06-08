import { Mutation, Resolver } from '@nestjs/graphql';
import { AdminOnly } from '@back/shared/decorators/auth.decorator';
import { OperationArchiveService } from './operation-archive.service';
import { AdminArchiveStaleOperationsResultModel } from './models/admin-archive-stale-operations-result.model';

@Resolver()
export class OperationArchiveResolver {
  public constructor(
    private readonly operationArchiveService: OperationArchiveService,
  ) {}

  @Mutation(() => AdminArchiveStaleOperationsResultModel, {
    name: 'adminArchiveStaleOperations',
  })
  @AdminOnly()
  public adminArchiveStaleOperations(): Promise<AdminArchiveStaleOperationsResultModel> {
    return this.operationArchiveService.archiveAllStaleMonths({
      deleteEnabled: true,
    });
  }
}
