import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { TotpService } from '@back/modules/auth/totp/totp.service';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  assertSafeBackupFilename,
  detectBackupFormat,
  getBackupSource,
  type BackupFormat,
  type BackupSource,
} from './db-backup.util';
import { DbRestoreJobRecord, DbRestoreJobStore } from './db-restore-job.store';

const execFileAsync = promisify(execFile);

export interface DbBackupFileDto {
  filename: string;
  sizeBytes: number;
  createdAt: Date;
  source: BackupSource;
  format: BackupFormat;
}

@Injectable()
export class DbBackupService {
  private readonly logger = new Logger(DbBackupService.name);

  public constructor(
    private readonly config: ConfigService,
    private readonly jobStore: DbRestoreJobStore,
    private readonly totpService: TotpService,
    private readonly prisma: PrismaService,
  ) {}

  public isRestoreEnabled(): boolean {
    const raw = this.config.get<string | boolean>('DB_RESTORE_ENABLED');
    return raw === true || raw === 'true';
  }

  public getBackupDir(): string {
    return this.config.get('DB_BACKUP_DIR') ?? '/app/backups';
  }

  public getTargetDatabase(): string {
    return this.config.getOrThrow<string>('POSTGRES_DB');
  }

  public getDeploymentEnv(): string {
    return this.config.get('DEPLOYMENT_ENV') ?? 'production';
  }

  public requiresTotpForRestore(): boolean {
    return this.getDeploymentEnv() === 'production';
  }

  public async listFiles(): Promise<DbBackupFileDto[]> {
    const dir = this.getBackupDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const names = await fs.promises.readdir(dir);
    const files = await Promise.all(
      names
        .filter((n) => /\.(dump|sql)$/i.test(n))
        .map(async (name) => {
          const fullPath = path.join(dir, name);
          const stat = await fs.promises.stat(fullPath);
          const head = Buffer.alloc(6);
          const fd = await fs.promises.open(fullPath, 'r');
          try {
            await fd.read(head, 0, 6, 0);
          } finally {
            await fd.close();
          }
          return {
            filename: name,
            sizeBytes: stat.size,
            createdAt: stat.mtime,
            source: getBackupSource(name),
            format: detectBackupFormat(head, name),
          };
        }),
    );
    return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async getJob(id: string): Promise<DbRestoreJobRecord | null> {
    return this.jobStore.get(id);
  }

  public async validateDumpFile(
    filePath: string,
    filename: string,
  ): Promise<BackupFormat> {
    const head = Buffer.alloc(6);
    const fd = await fs.promises.open(filePath, 'r');
    try {
      await fd.read(head, 0, 6, 0);
    } finally {
      await fd.close();
    }
    const format = detectBackupFormat(head, filename);
    if (format === 'custom') {
      await execFileAsync('pg_restore', ['-l', filePath]);
    }
    return format;
  }

  public async saveUploadedFile(
    tempPath: string,
    originalName: string,
  ): Promise<{ filename: string; sizeBytes: number; format: BackupFormat }> {
    const sanitized = path
      .basename(originalName)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    let baseName = sanitized;
    if (!/\.(dump|sql)$/i.test(baseName)) {
      baseName = `${baseName}.dump`;
    }
    const filename = `upload_${date}_${baseName}`;
    assertSafeBackupFilename(filename);
    const format = await this.validateDumpFile(tempPath, filename);
    await fs.promises.mkdir(this.getBackupDir(), { recursive: true });
    const dest = path.join(this.getBackupDir(), filename);
    await fs.promises.rename(tempPath, dest);
    const stat = await fs.promises.stat(dest);
    return { filename, sizeBytes: stat.size, format };
  }

  public async deleteFile(filename: string): Promise<boolean> {
    const safeName = assertSafeBackupFilename(filename);
    const filePath = path.join(this.getBackupDir(), safeName);
    try {
      await fs.promises.access(filePath);
    } catch {
      throw new BadRequestException('BACKUP_NOT_FOUND');
    }
    await fs.promises.unlink(filePath);
    this.logger.log({
      event: 'db_backup_deleted',
      filename: safeName,
    });
    return true;
  }

  public async startRestore(
    admin: User,
    filename: string,
    confirmDatabaseName: string,
    totpCode?: string,
  ): Promise<DbRestoreJobRecord> {
    if (!this.isRestoreEnabled()) {
      throw new ForbiddenException('DB_RESTORE_DISABLED');
    }
    if (confirmDatabaseName !== this.getTargetDatabase()) {
      throw new BadRequestException('DATABASE_NAME_MISMATCH');
    }
    if (this.requiresTotpForRestore()) {
      if (!totpCode) {
        throw new UnauthorizedException('TOTP_REQUIRED');
      }
      this.totpService.verifyPin(admin, totpCode);
    }

    const safeName = assertSafeBackupFilename(filename);
    const filePath = path.join(this.getBackupDir(), safeName);
    await fs.promises.access(filePath);
    const format = await this.validateDumpFile(filePath, safeName);

    const jobId = randomUUID();
    const job = await this.jobStore.create({
      id: jobId,
      status: 'pending',
      filename: safeName,
      targetDatabase: this.getTargetDatabase(),
      startedAt: new Date().toISOString(),
    });

    void this.executeRestoreJob(admin, jobId, filePath, format);
    return job;
  }

  private pgEnv() {
    return {
      host: this.config.getOrThrow<string>('POSTGRES_HOST'),
      user: this.config.getOrThrow<string>('POSTGRES_USER'),
      password: this.config.getOrThrow<string>('POSTGRES_PASSWORD'),
      db: this.getTargetDatabase(),
    };
  }

  private pgEnvWithPassword() {
    const env = this.pgEnv();
    return {
      ...env,
      execEnv: { ...process.env, PGPASSWORD: env.password },
    };
  }

  private async createPreRestoreBackup(): Promise<string> {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(this.getBackupDir(), `pre_restore_${date}.dump`);
    const { host, user, db, execEnv } = this.pgEnvWithPassword();
    await fs.promises.mkdir(this.getBackupDir(), { recursive: true });
    await execFileAsync(
      'pg_dump',
      ['-h', host, '-U', user, '-d', db, '-F', 'c', '-f', file],
      { env: execEnv },
    );
    return file;
  }

  private async terminateConnections(): Promise<void> {
    const { host, user, db, execEnv } = this.pgEnvWithPassword();
    const sql = `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db.replace(/'/g, "''")}' AND pid <> pg_backend_pid();`;
    await execFileAsync(
      'psql',
      ['-h', host, '-U', user, '-d', 'postgres', '-c', sql],
      { env: execEnv },
    );
  }

  private async runRestore(
    filePath: string,
    format: BackupFormat,
  ): Promise<void> {
    const { host, user, db, execEnv } = this.pgEnvWithPassword();
    if (format === 'custom') {
      await execFileAsync(
        'pg_restore',
        ['--clean', '--if-exists', '-h', host, '-U', user, '-d', db, filePath],
        { env: execEnv, maxBuffer: 10 * 1024 * 1024 },
      );
    } else {
      await execFileAsync(
        'psql',
        ['-h', host, '-U', user, '-d', db, '-f', filePath],
        { env: execEnv, maxBuffer: 10 * 1024 * 1024 },
      );
    }
  }

  private async executeRestoreJob(
    admin: User,
    jobId: string,
    filePath: string,
    format: BackupFormat,
  ): Promise<void> {
    const log: string[] = [];
    try {
      await this.jobStore.update(jobId, { status: 'running' });
      log.push('pre_restore backup...');
      await this.createPreRestoreBackup();
      log.push('terminating connections...');
      await this.prisma.$disconnect();
      await this.terminateConnections();
      await this.prisma.$connect();
      log.push('restoring...');
      await this.runRestore(filePath, format);
      await this.prisma.reconnect();
      await this.jobStore.update(jobId, {
        status: 'succeeded',
        finishedAt: new Date().toISOString(),
        logTail: log.join('\n'),
      });
      this.logger.log({
        event: 'db_restore',
        adminId: admin.id,
        email: admin.email,
        file: path.basename(filePath),
        targetDb: this.getTargetDatabase(),
        success: true,
      });
    } catch (error) {
      await this.prisma.reconnect().catch(() => undefined);
      const msg = error instanceof Error ? error.message : String(error);
      await this.jobStore.update(jobId, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        errorMessage: msg,
        logTail: log.join('\n'),
      });
      this.logger.error({
        event: 'db_restore',
        adminId: admin.id,
        error: msg,
      });
    }
  }
}
