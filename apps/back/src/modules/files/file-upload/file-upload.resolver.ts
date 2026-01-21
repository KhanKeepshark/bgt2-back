import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { FileUploadService } from './file-upload.service';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import * as Upload from 'graphql-upload/Upload.js';
import { SpreadsheetFileValidationPipe } from '@back/shared/pipes/spreadsheet-file-validation.pipe';
import { ExtractedOperationModel } from '../ai-upload/models/extracted-operation.model';
import { User } from '@prisma/generated';
import { Authorized } from '@back/shared/decorators/authorized.decorator';


@Resolver('FileUpload')
export class FileUploadResolver {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Authorization()
  @Mutation(() => [ExtractedOperationModel], { name: 'parseOperationsFile' })
  public async parseOperationsFile(
    @Args({ name: 'file', type: () => GraphQLUpload }, SpreadsheetFileValidationPipe)
    file: Upload,
    @Authorized() user: User,
  ) {
    return this.fileUploadService.parseOperationsFile(user, file);
  }
}
