import { useState } from 'react';
import type { Family } from './data';
import { needsBackupReminder, SNOOZE_FOR } from '../domain/backupReminder';
import { updateSettings } from '../db/operations';
import { backupResultMessage, saveBackupFile } from './backupAction';
import { useFeedback } from './Feedback';
import { DownloadIcon } from './icons';
import { formatDate } from './format';

/** A gentle, dismissible nudge on Home when recent stars are not in any backup. */
export function BackupReminder({ family }: { family: Family }) {
  const fb = useFeedback();
  const [busy, setBusy] = useState(false);
  if (!needsBackupReminder(family.settings, family, Date.now())) return null;
  const last = family.settings.lastBackupAt;

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const msg = backupResultMessage(await saveBackupFile());
      if (msg) fb.toast(msg);
    } catch {
      fb.toast('Could not create the backup—please try again.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function later() {
    updateSettings({ backupSnoozedUntil: Date.now() + SNOOZE_FOR }).catch(() => fb.toast('Could not save—please try again.', { tone: 'error' }));
  }

  return (
    <section className="reminder" aria-labelledby="backup-reminder">
      <h2 id="backup-reminder">Time for a backup</h2>
      <p>
        {last ? `Your last backup was on ${formatDate(last)}.` : 'You haven’t saved a backup yet.'} Save one and send it to yourself on WhatsApp so the
        stars are safe if this phone is lost.
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-quiet btn-small" onClick={later}>
          Later
        </button>
        <button type="button" className="btn btn-primary btn-small" disabled={busy} onClick={save}>
          <DownloadIcon size={18} /> Save backup
        </button>
      </div>
    </section>
  );
}
