import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/generated';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public async onModuleInit() {
    await this.$connect();
  }

  public async onModuleDestroy() {
    await this.$disconnect();
  }

  /** After pg_terminate_backend or restore — drop stale pool sockets. */
  public async reconnect(): Promise<void> {
    await this.$disconnect();
    await this.$connect();
  }
}
