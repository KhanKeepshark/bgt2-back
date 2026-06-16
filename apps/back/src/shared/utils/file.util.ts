import * as path from 'path';
import type { ReadStream } from 'fs';

export function sanitizeUploadBasename(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'upload';
}

export function sanitizeFileExtension(
  filename: string,
  fallback = 'tmp',
): string {
  const base = path.basename(filename);
  const dot = base.lastIndexOf('.');
  const ext = dot === -1 ? '' : base.slice(dot + 1);
  const safe = ext.replace(/[^a-zA-Z0-9]/g, '');
  return (safe || fallback).slice(0, 16);
}

export function validateFileFormat(filename: string, allowedFormats: string[]) {
  const fileParts = filename.split('.');
  const extension = fileParts[fileParts.length - 1];

  return allowedFormats.includes(extension);
}

export async function validateFileSize(
  fileStream: ReadStream,
  allowedFileSizeInBytes: number,
) {
  return new Promise((resolve, reject) => {
    let fileSizeInBytes = 0;

    fileStream
      .on('data', (data: Buffer) => {
        fileSizeInBytes += data.byteLength;
      })
      .on('end', () => {
        resolve(fileSizeInBytes <= allowedFileSizeInBytes);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}
