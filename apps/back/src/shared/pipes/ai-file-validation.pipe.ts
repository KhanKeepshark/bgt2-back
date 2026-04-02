import type { PipeTransform } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type * as Upload from 'graphql-upload/Upload.js';
import { FileError } from '../constants/errors.constants';
import { validateFileFormat, validateFileSize } from '../utils/file.util';

// 2mb
const MAX_FILE_SIZE = 1024 * 1024 * 2;
export class AiFileValidationPipe implements PipeTransform {
  public async transform(value: Upload) {
    const { createReadStream, filename } = value;

    if (!filename) {
      throw new BadRequestException(FileError.NOT_FOUND);
    }

    const fileStream = createReadStream();

    const allowedFileFormats = [
      'csv',
      'xlsx',
      'xls',
      'pdf',
      'doc',
      'docx',
      'txt',
      'json',
      'png',
      'jpg',
      'jpeg',
      'webp',
    ];
    const isValidFormat = validateFileFormat(filename, allowedFileFormats);

    if (!isValidFormat) {
      throw new BadRequestException(FileError.INVALID_FORMAT);
    }

    const isValidSize = await validateFileSize(fileStream, MAX_FILE_SIZE);

    if (!isValidSize) {
      throw new BadRequestException(
        JSON.stringify({
          code: FileError.SIZE_TOO_LARGE,
          params: { maxSize: '2 MB' },
        }),
      );
    }

    return value;
  }
}
