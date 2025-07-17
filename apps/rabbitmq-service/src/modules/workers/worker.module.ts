import { Module } from '@nestjs/common';
import { QueueWorkerService } from './worker.service';
import { WorkerController } from './worker.controller';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRabbitmqConfig } from '@mail/src/core/config/rabbitmq.config';
import { MailModule } from '../libs/mail/mail.module';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        imports: [ConfigModule],
        useFactory: getRabbitmqConfig,
        inject: [ConfigService],
      },
    ]),
    MailModule,
  ],
  providers: [QueueWorkerService],
  controllers: [WorkerController],
})
export class WorkerModule {}
