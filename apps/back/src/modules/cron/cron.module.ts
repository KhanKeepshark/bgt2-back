import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RecurrenceModule } from '../accounts/recurrenceConfig/recurrence.module';
import { OperationArchiveModule } from '../operation-archive/operation-archive.module';

@Module({
  imports: [ScheduleModule.forRoot(), RecurrenceModule, OperationArchiveModule],
  providers: [CronService],
})
export class CronModule {}
