import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportResolver } from './support.resolver';
import { RabbitmqModule } from '../../core/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitmqModule],
  providers: [SupportService, SupportResolver],
})
export class SupportModule {}
