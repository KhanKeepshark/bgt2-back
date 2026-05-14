import { Controller } from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';
import { AiUploadOrchestrator } from './ai-upload-orchestrator.service';

export interface ProcessAiUploadJob {
  taskId: string;
  userId: string;
  filePath: string;
  mimetype: string;
  estimatedTokens: number;
}

@Controller()
export class AiUploadController {
  constructor(private readonly aiUploadOrchestrator: AiUploadOrchestrator) {}

  @MessagePattern('process_ai_upload')
  async handleProcessAiUpload(
    @Payload() data: ProcessAiUploadJob,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const result = await this.aiUploadOrchestrator.processAiUploadTask(data);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      channel.nack(originalMsg, false, false);
      throw error;
    }
  }
}
