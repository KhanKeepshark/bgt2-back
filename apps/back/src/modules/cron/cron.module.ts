import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { ScheduleModule } from '@nestjs/schedule';
import { OperationModule } from '../accounts/operation/operation.module';

@Module({
  imports: [ScheduleModule.forRoot(), OperationModule],
  providers: [CronService],
})
export class CronModule {}
