import type { Activity, Entry, Reward, Settings } from './types';

export const DAY = 86_400_000;
/** Remind once there are unsaved changes and the last backup is this old. */
export const REMIND_AFTER = 7 * DAY;
export const SNOOZE_FOR = 3 * DAY;

/**
 * True when Mum has changes that are not in any backup and it has been a while.
 * Never nags a brand-new or unchanged family.
 */
export function needsBackupReminder(
  settings: Pick<Settings, 'lastBackupAt' | 'backupSnoozedUntil'>,
  data: { entries: readonly Entry[]; activities: readonly Activity[]; rewards: readonly Reward[] },
  now: number,
): boolean {
  if (data.entries.length === 0) return false;
  let firstChange = Infinity;
  let lastChange = 0;
  for (const e of data.entries) {
    firstChange = Math.min(firstChange, e.at);
    lastChange = Math.max(lastChange, e.at);
  }
  for (const x of [...data.activities, ...data.rewards]) lastChange = Math.max(lastChange, x.updatedAt);

  const { lastBackupAt, backupSnoozedUntil } = settings;
  if (lastBackupAt !== undefined && lastChange <= lastBackupAt) return false; // nothing new since the backup
  if (backupSnoozedUntil !== undefined && now < backupSnoozedUntil) return false;
  const since = lastBackupAt ?? firstChange;
  return now - since >= REMIND_AFTER;
}
