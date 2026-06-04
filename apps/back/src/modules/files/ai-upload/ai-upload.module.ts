import { Module } from '@nestjs/common';
import { AiUploadOrchestrator } from './ai-upload-orchestrator.service';
import { AiUploadResolver } from './ai-upload.resolver';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getAiUploadRmqOptions } from '@back/core/config/ai-upload-rmq.config';
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
          options: getAiUploadRmqOptions(configService),
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AiUploadController],
  providers: [AiUploadResolver, AiUploadOrchestrator, CategoryMatcherService],
})
export class AiUploadModule {}
