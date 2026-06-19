import { Injectable } from '@nestjs/common';
import { RedisService } from '@back/core/redis/redis.service';

const ESTIMATE_TTL_SEC = 600;

@Injectable()
export class AiUploadTokenEstimateStore {
  constructor(private readonly redis: RedisService) {}

  private key(userId: string, fileHash: string): string {
    return `ai-upload:estimate:${userId}:${fileHash}`;
  }

  public async save(
    userId: string,
    fileHash: string,
    tokenCount: number,
  ): Promise<void> {
    await this.redis.set(
      this.key(userId, fileHash),
      String(tokenCount),
      'EX',
      ESTIMATE_TTL_SEC,
    );
  }

  public async get(userId: string, fileHash: string): Promise<number | null> {
    const value = await this.redis.get(this.key(userId, fileHash));
    if (!value) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
