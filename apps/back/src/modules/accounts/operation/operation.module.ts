import { Module } from '@nestjs/common';
import { OperationService } from './operation.service';
import { OperationResolver } from './operation.resolver';
import { RecurrenceModule } from '../recurrenceConfig/recurrence.module';
import { OperationDataLoader } from './operation.dataloader';
import { ChartsDataService } from './charts/charts-data.service';

@Module({
  imports: [RecurrenceModule],
  providers: [
    OperationResolver,
    OperationService,
    OperationDataLoader,
    ChartsDataService,
  ],
  exports: [OperationService],
})
export class OperationModule {}
