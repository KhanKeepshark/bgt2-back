import { Module } from '@nestjs/common';
import { AiUploadOrchestrator } from './ai-upload-orchestrator.service';
import { AiUploadResolver } from './ai-upload.resolver';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiUploadController } from './ai-upload.controller';
import { CategoryMatcherService } from './services/category-matcher.service';

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
  providers: [AiUploadResolver, AiUploadOrchestrator, CategoryMatcherService],
})
export class AiUploadModule {}
