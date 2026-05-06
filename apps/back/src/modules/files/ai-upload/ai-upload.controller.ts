import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AiUploadService } from './ai-upload.service';

export interface ProcessAiUploadJob {
  taskId: string;
  userId: string;
  filePath: string;
  mimetype: string;
  estimatedTokens: number;
}

@Controller()
export class AiUploadController {
  constructor(private readonly aiUploadService: AiUploadService) {}

  @MessagePattern('process_ai_upload')
  async handleProcessAiUpload(@Payload() data: ProcessAiUploadJob) {
    return this.aiUploadService.processAiUploadTask(data);
  }
}
