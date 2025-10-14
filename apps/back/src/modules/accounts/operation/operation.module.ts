import { Module } from '@nestjs/common';
import { OperationService } from './operation.service';
import { OperationResolver } from './operation.resolver';
import { RecurrenceModule } from '../recurrenceConfig/recurrence.module';

@Module({
  imports: [RecurrenceModule],
  providers: [OperationResolver, OperationService],
  exports: [OperationService],
})
export class OperationModule {}
