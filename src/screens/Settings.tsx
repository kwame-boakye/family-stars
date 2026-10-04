import { useRef, useState } from 'react';
import type { Family } from '../ui/data';
import type { AvatarId, Child } from '../domain/types';
import { Sheet, Field, ErrorNote } from '../ui/controls';
import { Avatar, AVATARS } from '../ui/Avatar';
import { DownloadIcon, PencilIcon, UploadIcon } from '../ui/icons';
import { errorMessage, updateChild, updateSettings } from '../db/operations';
import { parseBackup, restoreBackup, type BackupPreview } from '../db/backup';
import { backupResultMessage, saveBackupFile } from '../ui/backupAction';
import { useFeedback } from '../ui/Feedback';
import { formatDateTime } from '../ui/format';
import { installApp, isIos, updateApp, usePwa } from '../pwa/pwa';
import { plural } from '../domain/ledger';

export function Settings({ family }: { family: Family }) {
  const fb = useFeedback();
  const pwa = usePwa();
  const [editChild, setEditChild] = useState<Child | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { settings } = family;

  async function saveBackup() {
    try {
      const msg = backupResultMessage(await saveBackupFile());
      if (msg) fb.toast(msg);
    } catch {
      fb.toast('Could not create the backup—please try again.', { tone: 'error' });
    }
  }

  async function onFile(file: File | undefined) {
    setRestoreError('');
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setRestoreError('That file could not be opened.');
      return;
    }
    const result = parseBackup(text);
    if (!result.ok) setRestoreError(`${result.error} Your current stars have not been changed.`);
    else setPreview(result.preview);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <main className="screen" id="main">
      <h1 className="screen-title">Settings</h1>

      <section className="panel" aria-labelledby="set-children">
        <h2 id="set-children">Children</h2>
        <ul className="plain-list">
          {family.children.map((c) => (
            <li key={c.id}>
              <button type="button" className="catalogue-row" onClick={() => setEditChild(c)}>
                <Avatar id={c.avatar} size={40} />
                <span className="catalogue-main">
                  <span className="catalogue-name">{c.nickname}</span>
                </span>
                <PencilIcon size={18} className="catalogue-edit" />
                <span className="sr-only">Edit</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="set-backup">
        <h2 id="set-backup">Backup</h2>
        <p className="muted">
          Stars are saved on this phone only. If the browser’s data is cleared or the phone is replaced, they can be lost. Save a backup now and then and send it somewhere safe, such as WhatsApp to yourself.
        </p>
        <p className="small">
          Last backup: <strong>{settings.lastBackupAt ? formatDateTime(settings.lastBackupAt) : 'never'}</strong>
        </p>
        <div className="btn-stack">
          <button type="button" className="btn btn-primary" onClick={saveBackup}>
            <DownloadIcon size={20} /> Save backup
          </button>
          <button type="button" className="btn btn-soft" onClick={() => fileRef.current?.click()}>
            <UploadIcon size={20} /> Restore backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} data-testid="restore-input" />
        </div>
        <ErrorNote>{restoreError}</ErrorNote>
      </section>

      <section className="panel" aria-labelledby="set-display">
        <h2 id="set-display">Celebrations</h2>
        <label className="switch-row">
          <span>
            Star animation when stars are awarded
            <span className="muted small block">Also turned off when the phone is set to reduce motion.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={settings.celebrations}
            onChange={(e) => updateSettings({ celebrations: e.target.checked }).catch(() => fb.toast('Could not save—please try again.', { tone: 'error' }))}
          />
        </label>
      </section>

      <section className="panel" aria-labelledby="set-offline">
        <h2 id="set-offline">Offline use</h2>
        {!pwa.supported ? (
          <p>This browser cannot prepare the app for offline use. Stars are still saved on this phone.</p>
        ) : pwa.offlineReady ? (
          <p className="ok-text">✓ Ready to use offline. The app will open and save stars without internet.</p>
        ) : (
          <p>Preparing for offline use… Keep the internet on and the app open for a moment.</p>
        )}
        {pwa.updateReady && (
          <div className="update-box">
            <p>A new version of Family Stars is ready. Your stars are kept.</p>
            <button type="button" className="btn btn-soft" onClick={() => updateApp()}>
              Update now
            </button>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="set-install">
        <h2 id="set-install">Add to home screen</h2>
        {pwa.installed ? (
          <p>Family Stars is installed on this phone.</p>
        ) : pwa.canInstall ? (
          <>
            <p>Install the app so it opens like any other app, even offline.</p>
            <button type="button" className="btn btn-soft" onClick={() => installApp()}>
              Install Family Stars
            </button>
          </>
        ) : isIos() ? (
          <ol className="steps">
            <li>Open this page in Safari.</li>
            <li>
              Tap the <strong>Share</strong> button (square with an arrow).
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </li>
          </ol>
        ) : (
          <ol className="steps">
            <li>Open the browser menu (⋮).</li>
            <li>
              Choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.
            </li>
          </ol>
        )}
      </section>

      <p className="muted small center">Family Stars · dates shown in Ghana time</p>

      {editChild && <ChildForm key={editChild.id} child={editChild} onClose={() => setEditChild(null)} />}
      {preview && <RestoreSheet preview={preview} onClose={() => setPreview(null)} />}
    </main>
  );
}

function ChildForm({ child, onClose }: { child: Child; onClose: () => void }) {
  const fb = useFeedback();
  const [nickname, setNickname] = useState(child.nickname);
  const [avatar, setAvatar] = useState<AvatarId>(child.avatar);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await updateChild(child.id, { nickname, avatar });
      fb.toast('Saved.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      accent={child.colour}
      title={`Edit ${child.nickname}`}
      footer={
        <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <Field label="Nickname" htmlFor="child-nick">
        <input id="child-nick" className="input" value={nickname} maxLength={60} onChange={(e) => setNickname(e.target.value)} />
      </Field>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <ErrorNote>{error}</ErrorNote>
    </Sheet>
  );
}

export function AvatarPicker({ value, onChange, name = 'avatar' }: { value: AvatarId; onChange: (a: AvatarId) => void; name?: string }) {
  return (
    <fieldset className="avatar-picker">
      <legend className="field-label">Picture</legend>
      <div className="avatar-grid">
        {AVATARS.map((a) => (
          <label key={a.id} className={`avatar-opt ${value === a.id ? 'selected' : ''}`}>
            <input type="radio" name={name} className="sr-only" checked={value === a.id} onChange={() => onChange(a.id)} />
            <Avatar id={a.id} size={52} />
            <span className="sr-only">{a.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RestoreSheet({ preview, onClose }: { preview: BackupPreview; onClose: () => void }) {
  const fb = useFeedback();
  const [saving, setSaving] = useState(false);
  const [savedCurrent, setSavedCurrent] = useState(false);
  const [error, setError] = useState('');

  async function saveCurrentFirst() {
    try {
      if ((await saveBackupFile()) !== 'cancelled') setSavedCurrent(true);
    } catch {
      setError('Could not save the current data. You can still cancel.');
    }
  }

  async function restore() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await restoreBackup(preview.data);
      fb.toast('Backup restored.');
      onClose();
    } catch {
      setError('Could not restore—nothing was changed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Restore this backup?"
      footer={
        <div className="btn-row">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={saving} onClick={restore}>
            {saving ? 'Restoring…' : 'Replace with backup'}
          </button>
        </div>
      }
    >
      <p>
        Backup from <strong>{formatDateTime(preview.exportedAt)}</strong>:
      </p>
      <ul className="preview-list">
        {preview.children.map((c, i) => (
          <li key={i}>
            <strong>{c.nickname}</strong> — {plural(c.balance)}
          </li>
        ))}
      </ul>
      <p className="warn-text">This replaces everything currently on this phone—children, stars, history, activities and rewards. It does not merge.</p>
      <button type="button" className="btn btn-soft btn-block" onClick={saveCurrentFirst} disabled={savedCurrent}>
        <DownloadIcon size={20} /> {savedCurrent ? 'Current data saved' : 'Save current data first'}
      </button>
      <ErrorNote>{error}</ErrorNote>
    </Sheet>
  );
}
