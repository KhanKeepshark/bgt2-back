import { createHash } from 'crypto';

export const hashFileBuffer = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');
