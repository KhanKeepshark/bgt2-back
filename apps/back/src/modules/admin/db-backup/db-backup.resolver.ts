import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminOnly } from '@back/shared/decorators/auth.decorator';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { DbBackupService } from './db-backup.service';
import { DbBackupFileModel } from './models/db-backup-file.model';
import { DbRestoreJobModel } from './models/db-restore-job.model';
import { AdminDbDeploymentInfoModel } from './models/admin-db-deployment-info.model';
import { DbRestoreJobRecord } from './db-restore-job.store';

@Resolver()
export class DbBackupResolver {
  public constructor(private readonly dbBackupService: DbBackupService) {}

  @Query(() => AdminDbDeploymentInfoModel, { name: 'adminDbDeploymentInfo' })
  @AdminOnly()
  public adminDbDeploymentInfo(): AdminDbDeploymentInfoModel {
    return {
      environment: this.dbBackupService.getDeploymentEnv(),
      targetDatabase: this.dbBackupService.getTargetDatabase(),
      restoreEnabled: this.dbBackupService.isRestoreEnabled(),
      totpRequiredForRestore: this.dbBackupService.requiresTotpForRestore(),
    };
  }

  @Query(() => [DbBackupFileModel], { name: 'adminDbBackupFiles' })
  @AdminOnly()
  public adminDbBackupFiles() {
    return this.dbBackupService.listFiles();
  }

  @Query(() => DbRestoreJobModel, {
    name: 'adminDbRestoreJob',
    nullable: true,
  })
  @AdminOnly()
  public async adminDbRestoreJob(@Args('id', { type: () => ID }) id: string) {
    const job = await this.dbBackupService.getJob(id);
    return job ? this.toJobModel(job) : null;
  }

  @Mutation(() => Boolean, { name: 'adminDeleteDbBackup' })
  @AdminOnly()
  public adminDeleteDbBackup(@Args('filename') filename: string) {
    return this.dbBackupService.deleteFile(filename);
  }

  @Mutation(() => DbRestoreJobModel, { name: 'adminStartDbRestore' })
  @AdminOnly()
  public async adminStartDbRestore(
    @Authorized() user: User,
    @Args('filename') filename: string,
    @Args('confirmDatabaseName') confirmDatabaseName: string,
    @Args('totpCode', { nullable: true }) totpCode?: string,
  ) {
    const job = await this.dbBackupService.startRestore(
      user,
      filename,
      confirmDatabaseName,
      totpCode,
    );
    return this.toJobModel(job);
  }

  private toJobModel(record: DbRestoreJobRecord): DbRestoreJobModel {
    return {
      id: record.id,
      status: record.status,
      filename: record.filename,
      targetDatabase: record.targetDatabase,
      startedAt: new Date(record.startedAt),
      finishedAt: record.finishedAt ? new Date(record.finishedAt) : undefined,
      errorMessage: record.errorMessage,
      logTail: record.logTail,
    };
  }
}
