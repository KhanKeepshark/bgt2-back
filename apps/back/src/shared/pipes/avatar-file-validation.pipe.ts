import type { PipeTransform } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type * as Upload from 'graphql-upload/Upload.js';
import { FileError } from '../constants/errors.constants';
import { validateFileFormat, validateFileSize } from '../utils/file.util';

export class AvatarFileValidationPipe implements PipeTransform {
  public async transform(value: Upload) {
    const { createReadStream, filename } = value;

    if (!filename) {
      throw new BadRequestException(FileError.NOT_FOUND);
    }

    const fileStream = createReadStream();

    const allowedFileFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const isValidFormat = validateFileFormat(filename, allowedFileFormats);

    if (!isValidFormat) {
      throw new BadRequestException(FileError.INVALID_FORMAT);
    }

    // 10MB
    const isValidSize = await validateFileSize(fileStream, 1024 * 1024 * 10);

    if (!isValidSize) {
      throw new BadRequestException(
        JSON.stringify({
          code: FileError.SIZE_TOO_LARGE,
          params: { maxSize: '10 MB' },
        }),
      );
    }

    return value;
  }
}
