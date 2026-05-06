import { Module } from '@nestjs/common';
import { AiUploadService } from './ai-upload.service';
import { AiUploadResolver } from './ai-upload.resolver';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiUploadController } from './ai-upload.controller';
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AI_UPLOAD_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${configService.get<string>('RABBITMQ_USER')}:${configService.get<string>('RABBITMQ_PASSWORD')}@${configService.get<string>('RABBITMQ_NAME')}:5672`,
            ],
            queue: 'ai_upload_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AiUploadController],
  providers: [AiUploadResolver, AiUploadService],
})
export class AiUploadModule {}
