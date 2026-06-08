import { Module } from '@nestjs/common';
import { OperationArchiveService } from './operation-archive.service';
import { OperationArchiveResolver } from './operation-archive.resolver';
import { PrismaModule } from '@back/core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OperationArchiveService, OperationArchiveResolver],
  exports: [OperationArchiveService],
})
export class OperationArchiveModule {}
