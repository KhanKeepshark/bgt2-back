import { Module } from '@nestjs/common';
import { RecurrenceService } from './recurrence.service';
import { RecurrenceResolver } from './recurrence.resolver';

@Module({
  providers: [RecurrenceService, RecurrenceResolver],
  exports: [RecurrenceService],
})
export class RecurrenceModule {}
