import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AiUploadService } from './ai-upload.service';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import * as Upload from 'graphql-upload/Upload.js';
import { User } from '@prisma/generated';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { AiFileValidationPipe } from '@back/shared/pipes/ai-file-validation.pipe';
import { AiUploadResultModel } from './models/ai-upload-result.model';
import { AiCountModel } from './models/ai-count.model';

@Resolver()
export class AiUploadResolver {
  constructor(private readonly uploadService: AiUploadService) {}

  @Authorization()
  @Mutation(() => AiUploadResultModel, { name: 'aiFileUpload' })
  public async aiFileUpload(
    @Authorized() user: User,
    @Args({ name: 'file', type: () => GraphQLUpload }, AiFileValidationPipe) file: Upload,
  ): Promise<AiUploadResultModel> {
    return await this.uploadService.aiFileUpload(user, file);
  }

  @Authorization()
  @Mutation(() => AiCountModel, { name: 'aiFileTokenCount' })
  public async aiFileTokenCount(
    @Authorized() user: User,
    @Args({ name: 'file', type: () => GraphQLUpload }, AiFileValidationPipe) file: Upload,
  ): Promise<{ tokenCount: number }> {
    return await this.uploadService.aiFileTokenCount(user, file);
  }
}