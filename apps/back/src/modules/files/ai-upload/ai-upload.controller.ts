import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
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
  async handleProcessAiUpload(@Payload() data: ProcessAiUploadJob) {
    return this.aiUploadOrchestrator.processAiUploadTask(data);
  }
}
