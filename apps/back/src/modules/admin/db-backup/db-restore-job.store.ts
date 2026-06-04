import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@back/core/redis/redis.service';

export type DbRestoreJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface DbRestoreJobRecord {
  id: string;
  status: DbRestoreJobStatus;
  filename: string;
  targetDatabase: string;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  logTail?: string;
}

@Injectable()
export class DbRestoreJobStore {
  public constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private key(id: string): string {
    return `db-restore:${id}`;
  }

  private ttlSec(): number {
    return Number(this.config.get('DB_RESTORE_JOB_TTL_SEC') ?? 3600);
  }

  public async create(record: DbRestoreJobRecord): Promise<DbRestoreJobRecord> {
    await this.redis.set(
      this.key(record.id),
      JSON.stringify(record),
      'EX',
      this.ttlSec(),
    );
    return record;
  }

  public async update(
    id: string,
    patch: Partial<DbRestoreJobRecord>,
  ): Promise<DbRestoreJobRecord | null> {
    const current = await this.get(id);
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch };
    await this.redis.set(
      this.key(id),
      JSON.stringify(next),
      'EX',
      this.ttlSec(),
    );
    return next;
  }

  public async get(id: string): Promise<DbRestoreJobRecord | null> {
    const raw = await this.redis.get(this.key(id));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as DbRestoreJobRecord;
  }
}
