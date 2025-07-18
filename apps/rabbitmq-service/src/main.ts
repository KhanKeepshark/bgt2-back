import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { CoreModule } from './core/core.module';

async function bootstrap() {
  const rabbitName = process.env.RABBITMQ_NAME;
  const rabbitUser = process.env.RABBITMQ_USER;
  const rabbitPassword = process.env.RABBITMQ_PASSWORD;

  const app = await NestFactory.createMicroservice(CoreModule, {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${rabbitUser}:${rabbitPassword}@${rabbitName}:5672`],
      queue: 'main_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.listen();
  Logger.log('RabbitMQ Service is listening on queue: main_queue');
}
bootstrap();
