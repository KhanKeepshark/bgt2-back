import { Module } from '@nestjs/common';
import { OperationService } from './operation.service';
import { OperationResolver } from './operation.resolver';
import { RecurrenceModule } from '../recurrenceConfig/recurrence.module';
import { OperationDataLoader } from './operation.dataloader';

@Module({
  imports: [RecurrenceModule],
  providers: [OperationResolver, OperationService, OperationDataLoader],
  exports: [OperationService],
})
export class OperationModule {}
