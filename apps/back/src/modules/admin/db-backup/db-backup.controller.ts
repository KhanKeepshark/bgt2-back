import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { diskStorage } from 'multer';
import * as os from 'os';
import { DbBackupService } from './db-backup.service';
import { AdminRestGuard } from './guards/admin-rest.guard';
import { DbRestoreJobRecord } from './db-restore-job.store';

const uploadMaxBytes =
  Number(process.env.DB_BACKUP_UPLOAD_MAX_BYTES) || 524288000;

@Controller('admin/db-backups')
@UseGuards(AdminRestGuard)
export class DbBackupController {
  public constructor(private readonly dbBackupService: DbBackupService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          cb(null, `db-upload-${Date.now()}-${file.originalname}`);
        },
      }),
      limits: {
        fileSize: uploadMaxBytes,
      },
    }),
  )
  public async upload(
    @UploadedFile() file?: { path: string; originalname: string },
  ) {
    if (!file?.path) {
      throw new BadRequestException('FILE_REQUIRED');
    }
    return this.dbBackupService.saveUploadedFile(file.path, file.originalname);
  }

  @Post(':filename/restore')
  public async restore(
    @Authorized() user: User,
    @Param('filename') filename: string,
    @Body() body: { confirmDatabaseName: string; totpCode?: string },
  ): Promise<{ jobId: string }> {
    const job: DbRestoreJobRecord = await this.dbBackupService.startRestore(
      user,
      filename,
      body.confirmDatabaseName,
      body.totpCode,
    );
    return { jobId: job.id };
  }
}
