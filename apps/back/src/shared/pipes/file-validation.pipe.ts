import type { PipeTransform } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type * as Upload from 'graphql-upload/Upload.js';
import { validateFileFormat, validateFileSize } from '../utils/file.util';

export class FileValidationPipe implements PipeTransform {
  public async transform(value: Upload) {
    const { createReadStream, filename } = value;

    if (!filename) {
      throw new BadRequestException('File not found');
    }

    const fileStream = createReadStream();

    const allowedFileFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const isValidFormat = validateFileFormat(filename, allowedFileFormats);

    if (!isValidFormat) {
      throw new BadRequestException('Invalid file format');
    }

    // 10MB
    const isValidSize = await validateFileSize(fileStream, 1024 * 1024 * 10);

    if (!isValidSize) {
      throw new BadRequestException('File size is too large');
    }

    return value;
  }
}
