import { backupFileName, buildBackup, markBackedUp } from '../db/backup';

export type BackupResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Saves a backup file. Where the phone supports sharing files (most Android
 * and iPhone browsers), this opens the share sheet so Mum can send it to
 * WhatsApp, Drive or email; otherwise the file is downloaded.
 * The backup is only recorded as done when the file actually left the app.
 */
export async function saveBackupFile(): Promise<BackupResult> {
  const now = Date.now();
  const backup = await buildBackup(now);
  const name = backupFileName(now);
  const json = JSON.stringify(backup, null, 2);

  const file = typeof File === 'function' ? new File([json], name, { type: 'application/json' }) : null;
  if (file && typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Family Stars backup' });
      await markBackedUp(now);
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason (e.g. not allowed); fall back to a download.
    }
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await markBackedUp(now);
  return 'downloaded';
}

export function backupResultMessage(result: BackupResult): string | null {
  if (result === 'shared') return 'Backup sent. Keep that message or file somewhere safe.';
  if (result === 'downloaded') return 'Backup saved to Downloads. Keep a copy off this phone too, such as in email or WhatsApp.';
  return null;
}
