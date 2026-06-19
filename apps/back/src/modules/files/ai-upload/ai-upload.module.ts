import { Module } from '@nestjs/common';
import { AiUploadOrchestrator } from './ai-upload-orchestrator.service';
import { AiUploadResolver } from './ai-upload.resolver';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getAiUploadRmqOptions } from '@back/core/config/ai-upload-rmq.config';
import { AiUploadController } from './ai-upload.controller';
import { CategoryMatcherService } from './services/category-matcher.service';
import { AiUploadTokenEstimateStore } from './services/ai-upload-token-estimate.store';
import { RedisModule } from '@back/core/redis/redis.module';

@Module({
  imports: [
    RedisModule,
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
  providers: [
    AiUploadResolver,
    AiUploadOrchestrator,
    CategoryMatcherService,
    AiUploadTokenEstimateStore,
  ],
})
export class AiUploadModule {}
