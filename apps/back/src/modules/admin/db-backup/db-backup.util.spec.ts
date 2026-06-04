import {
  assertSafeBackupFilename,
  detectBackupFormat,
  getBackupSource,
} from './db-backup.util';

describe('assertSafeBackupFilename', () => {
  it('rejects path traversal', () => {
    expect(() => assertSafeBackupFilename('../etc/passwd')).toThrow();
    expect(() => assertSafeBackupFilename('a/b.dump')).toThrow();
  });

  it('allows simple names', () => {
    expect(assertSafeBackupFilename('db_backup_2026.dump')).toBe(
      'db_backup_2026.dump',
    );
  });
});

describe('getBackupSource', () => {
  it('labels cron uploads and pre_restore', () => {
    expect(getBackupSource('db_backup_x.dump')).toBe('cron');
    expect(getBackupSource('upload_x.dump')).toBe('upload');
    expect(getBackupSource('pre_restore_x.dump')).toBe('pre_restore');
  });
});

describe('detectBackupFormat', () => {
  it('detects custom pg_dump header', () => {
    const buf = Buffer.from([0x50, 0x47, 0x44, 0x4d, 0x50, 0x00]);
    expect(detectBackupFormat(buf, 'x.dump')).toBe('custom');
  });

  it('detects plain sql by extension', () => {
    expect(detectBackupFormat(Buffer.from('-- PostgreSQL'), 'x.sql')).toBe(
      'plain',
    );
  });
});
