const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

export type BackupFormat = 'custom' | 'plain';
export type BackupSource = 'cron' | 'upload' | 'pre_restore' | 'unknown';

export function assertSafeBackupFilename(name: string): string {
  if (!SAFE_NAME.test(name)) {
    throw new Error('Invalid backup filename');
  }
  return name;
}

export function getBackupSource(filename: string): BackupSource {
  if (filename.startsWith('db_backup_')) {
    return 'cron';
  }
  if (filename.startsWith('upload_')) {
    return 'upload';
  }
  if (filename.startsWith('pre_restore_')) {
    return 'pre_restore';
  }
  return 'unknown';
}

export function detectBackupFormat(
  head: Buffer,
  filename: string,
): BackupFormat {
  if (head.length >= 5 && head.subarray(0, 5).toString() === 'PGDMP') {
    return 'custom';
  }
  if (filename.endsWith('.sql')) {
    return 'plain';
  }
  return 'custom';
}
