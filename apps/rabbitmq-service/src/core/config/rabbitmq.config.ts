import type { ConfigService } from '@nestjs/config';
import type { RmqOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';

export const getRabbitmqConfig = (configService: ConfigService): RmqOptions => {
  const rabbitUser = configService.getOrThrow<string>('RABBITMQ_USER');
  const rabbitPassword = configService.getOrThrow<string>('RABBITMQ_PASSWORD');
  const rabbitName = configService.getOrThrow<string>('RABBITMQ_NAME');

  console.log(`amqp://${rabbitUser}:${rabbitPassword}@${rabbitName}:5672`);

  return {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${rabbitUser}:${rabbitPassword}@${rabbitName}:5672`],
      queue: 'main_queue',
      queueOptions: {
        durable: true,
      },
    },
  };
};
