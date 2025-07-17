import type { ConfigService } from '@nestjs/config';
import type { RmqOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';

export const getRabbitmqConfig = (
  configService: ConfigService,
): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [configService.getOrThrow<string>('RABBITMQ_URI')],
    queue: 'main_queue',
    queueOptions: {
      durable: true,
    },
  },
});
