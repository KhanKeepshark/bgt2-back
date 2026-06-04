import { Module } from '@nestjs/common';
import { TotpModule } from '@back/modules/auth/totp/totp.module';
import { DbBackupService } from './db-backup.service';
import { DbRestoreJobStore } from './db-restore-job.store';
import { DbBackupResolver } from './db-backup.resolver';
import { DbBackupController } from './db-backup.controller';
import { AdminRestGuard } from './guards/admin-rest.guard';

@Module({
  imports: [TotpModule],
  providers: [
    DbBackupService,
    DbRestoreJobStore,
    DbBackupResolver,
    AdminRestGuard,
  ],
  controllers: [DbBackupController],
})
export class DbBackupModule {}
