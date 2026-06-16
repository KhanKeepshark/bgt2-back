import { Injectable, Logger } from '@nestjs/common';
import { sanitizeFileExtension } from '@back/shared/utils/file.util';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  public saveTempFile(buffer: Buffer, filename: string): string {
    const tempDir = path.join(process.cwd(), 'uploads', 'ai-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileExt = sanitizeFileExtension(filename);
    const filePath = path.join(tempDir, `${uuidv4()}.${fileExt}`);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(tempDir);
    if (
      resolvedPath !== resolvedDir &&
      !resolvedPath.startsWith(`${resolvedDir}${path.sep}`)
    ) {
      throw new Error('Invalid file path');
    }
    fs.writeFileSync(resolvedPath, buffer);
    return resolvedPath;
  }

  public readTempFile(filePath: string): Buffer {
    return fs.readFileSync(filePath);
  }

  public deleteTempFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        this.logger.error(
          `Failed to delete temp file ${filePath}: ${error.message}`,
        );
      }
    }
  }
}
