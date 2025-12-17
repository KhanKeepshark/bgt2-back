import { Module } from '@nestjs/common';
import { AiUploadService } from './ai-upload.service';
import { AiUploadResolver } from './ai-upload.resolver';

@Module({
  imports: [],
  providers: [AiUploadResolver, AiUploadService],
})
export class AiUploadModule {}
