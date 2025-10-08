import { Module } from '@nestjs/common';
import { OperationService } from './operation.service';
import { OperationResolver } from './operation.resolver';

@Module({
  providers: [OperationResolver, OperationService],
  exports: [OperationService],
})
export class OperationModule {}
