import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RecurrenceModule } from '../accounts/recurrenceConfig/recurrence.module';

@Module({
  imports: [ScheduleModule.forRoot(), RecurrenceModule],
  providers: [CronService],
})
export class CronModule {}
