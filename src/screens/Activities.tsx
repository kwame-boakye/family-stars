import { useState } from 'react';
import type { Family } from '../ui/data';
import type { Activity, Child } from '../domain/types';
import { Sheet, Stepper, Field, ErrorNote, EmojiPicker } from '../ui/controls';
import { Avatar } from '../ui/Avatar';
import { PlusIcon, PencilIcon } from '../ui/icons';
import { errorMessage, saveActivity, setActivityArchived } from '../db/operations';
import { newId } from '../db/schema';
import { useFeedback } from '../ui/Feedback';
import { plural } from '../domain/ledger';

let formSeq = 0;

export function Activities({ family }: { family: Family }) {
  const [editing, setEditing] = useState<{ id: string; isNew: boolean; n: number } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const active = family.activities.filter((a) => !a.archived).sort((a, b) => a.name.localeCompare(b.name));
  const archived = family.activities.filter((a) => a.archived).sort((a, b) => a.name.localeCompare(b.name));
  const editingActivity = editing && family.activities.find((a) => a.id === editing.id);

  return (
    <main className="screen" id="main">
      <div className="screen-head">
        <h1 className="screen-title">Activities</h1>
        <button type="button" className="btn btn-primary btn-small" onClick={() => setEditing({ id: newId(), isNew: true, n: ++formSeq })}>
          <PlusIcon size={20} /> Add
        </button>
      </div>
      <p className="muted">Things that earn stars. Tap one to change it.</p>

      {active.length === 0 ? (
        <div className="empty">
          <p>No activities yet. You can still award stars for an extra good deed.</p>
        </div>
      ) : (
        <ul className="catalogue">
          {active.map((a) => (
            <ActivityRow key={a.id} activity={a} kids={family.children} onEdit={() => setEditing({ id: a.id, isNew: false, n: ++formSeq })} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="archived">
          <button type="button" className="link-btn" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Hide' : 'Show'} archived activities ({archived.length})
          </button>
          {showArchived && (
            <ul className="catalogue">
              {archived.map((a) => (
                <ActivityRow key={a.id} activity={a} kids={family.children} onEdit={() => setEditing({ id: a.id, isNew: false, n: ++formSeq })} />
              ))}
            </ul>
          )}
        </section>
      )}

      {editing && (
        <ActivityForm
          key={editing.n}
          id={editing.id}
          existing={editing.isNew ? undefined : editingActivity ?? undefined}
          kids={family.children}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

function ActivityRow({ activity: a, kids, onEdit }: { activity: Activity; kids: Child[]; onEdit: () => void }) {
  const names = kids.filter((k) => a.childIds.includes(k.id)).map((k) => k.nickname);
  return (
    <li>
      <button type="button" className="catalogue-row" onClick={onEdit}>
        <span className="catalogue-icon" aria-hidden="true">
          {a.icon ?? '⭐'}
        </span>
        <span className="catalogue-main">
          <span className="catalogue-name">{a.name}</span>
          <span className="catalogue-meta">{a.archived ? 'Archived' : names.join(' & ')}</span>
        </span>
        <span className="catalogue-value">{plural(a.stars)}</span>
        <PencilIcon size={18} className="catalogue-edit" />
      </button>
    </li>
  );
}

function ActivityForm({ id, existing, kids, onClose }: { id: string; existing?: Activity; kids: Child[]; onClose: () => void }) {
  const fb = useFeedback();
  const [name, setName] = useState(existing?.name ?? '');
  const [stars, setStars] = useState(String(existing?.stars ?? 1));
  const [icon, setIcon] = useState<string | undefined>(existing?.icon);
  const [childIds, setChildIds] = useState<string[]>(existing?.childIds ?? kids.map((k) => k.id));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await saveActivity(id, { name, stars, icon, childIds });
      fb.toast(existing ? 'Activity saved.' : 'Activity added.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    if (!existing || saving) return;
    setSaving(true);
    try {
      await setActivityArchived(existing.id, !existing.archived);
      fb.toast(existing.archived ? `“${existing.name}” is back in the award list.` : `“${existing.name}” archived. Past awards stay in history.`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const toggle = (cid: string) => setChildIds((ids) => (ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]));

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? 'Edit activity' : 'New activity'}
      footer={
        <div className="btn-row">
          {existing && (
            <button type="button" className="btn btn-quiet" disabled={saving} onClick={toggleArchive}>
              {existing.archived ? 'Restore' : 'Archive'}
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Name" htmlFor="act-name">
          <input id="act-name" className="input" value={name} maxLength={60} placeholder="e.g. Put toys away" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Stars earned">
          <Stepper label="Stars" value={stars} onChange={setStars} />
        </Field>
        <fieldset className="kid-picks">
          <legend className="field-label">Who can earn it?</legend>
          {kids.map((k) => (
            <label key={k.id} className={`kid-pick accent-${k.colour}`}>
              <input type="checkbox" checked={childIds.includes(k.id)} onChange={() => toggle(k.id)} />
              <Avatar id={k.avatar} size={32} />
              <span>{k.nickname}</span>
            </label>
          ))}
        </fieldset>
        <EmojiPicker value={icon} onChange={setIcon} />
        {existing && <p className="muted small">Changes apply to future awards only. Past awards keep their original name and stars.</p>}
        <ErrorNote>{error}</ErrorNote>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
