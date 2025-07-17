import { Module } from '@nestjs/common';
import { WorkerModule } from '../modules/workers/worker.module';

@Module({
  imports: [WorkerModule],
})
export class CoreModule {}
