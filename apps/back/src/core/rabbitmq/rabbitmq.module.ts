import { Module, Global } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';
import { getRabbitmqConfig } from '../config/rabbitmq.config';

@Global()
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
  ],
  providers: [RabbitmqService],
  exports: [RabbitmqService, ClientsModule],
})
export class RabbitmqModule {}
