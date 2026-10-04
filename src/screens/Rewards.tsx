import { useState } from 'react';
import type { Family } from '../ui/data';
import type { Reward } from '../domain/types';
import { Sheet, Stepper, Field, ErrorNote, EmojiPicker } from '../ui/controls';
import { PlusIcon, PencilIcon } from '../ui/icons';
import { errorMessage, saveReward, setRewardArchived } from '../db/operations';
import { newId } from '../db/schema';
import { useFeedback } from '../ui/Feedback';
import { activeRewardsByCost, plural } from '../domain/ledger';
import { href } from '../ui/router';

let formSeq = 0;

export function Rewards({ family }: { family: Family }) {
  const [editing, setEditing] = useState<{ id: string; isNew: boolean; n: number } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const active = activeRewardsByCost(family.rewards);
  const archived = family.rewards.filter((r) => r.archived).sort((a, b) => a.cost - b.cost);
  const editingReward = editing && family.rewards.find((r) => r.id === editing.id);

  const row = (r: Reward) => (
    <li key={r.id}>
      <button type="button" className="catalogue-row" onClick={() => setEditing({ id: r.id, isNew: false, n: ++formSeq })}>
        <span className="catalogue-icon" aria-hidden="true">
          {r.icon ?? '🎁'}
        </span>
        <span className="catalogue-main">
          <span className="catalogue-name">{r.name}</span>
          {r.archived && <span className="catalogue-meta">Archived</span>}
        </span>
        <span className="catalogue-value">{plural(r.cost)}</span>
        <PencilIcon size={18} className="catalogue-edit" />
      </button>
    </li>
  );

  return (
    <main className="screen" id="main">
      <div className="screen-head">
        <h1 className="screen-title">Rewards</h1>
        <button type="button" className="btn btn-primary btn-small" onClick={() => setEditing({ id: newId(), isNew: true, n: ++formSeq })}>
          <PlusIcon size={20} /> Add
        </button>
      </div>
      <p className="muted">
        Each child saves for rewards with their own stars. To redeem, open a child’s{' '}
        {family.children.map((c, i) => (
          <span key={c.id}>
            {i > 0 && ' or '}
            <a href={href({ name: 'child', childId: c.id, view: 'rewards' })}>{c.nickname}’s rewards</a>
          </span>
        ))}
        .
      </p>

      {active.length === 0 ? (
        <div className="empty">
          <p>No rewards yet. Stars keep adding up in the meantime.</p>
          <button type="button" className="btn btn-primary" onClick={() => setEditing({ id: newId(), isNew: true, n: ++formSeq })}>
            Add a reward
          </button>
        </div>
      ) : (
        <ul className="catalogue">{active.map(row)}</ul>
      )}

      {archived.length > 0 && (
        <section className="archived">
          <button type="button" className="link-btn" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Hide' : 'Show'} archived rewards ({archived.length})
          </button>
          {showArchived && <ul className="catalogue">{archived.map(row)}</ul>}
        </section>
      )}

      {editing && (
        <RewardForm key={editing.n} id={editing.id} existing={editing.isNew ? undefined : editingReward ?? undefined} onClose={() => setEditing(null)} />
      )}
    </main>
  );
}

function RewardForm({ id, existing, onClose }: { id: string; existing?: Reward; onClose: () => void }) {
  const fb = useFeedback();
  const [name, setName] = useState(existing?.name ?? '');
  const [cost, setCost] = useState(String(existing?.cost ?? 10));
  const [icon, setIcon] = useState<string | undefined>(existing?.icon);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await saveReward(id, { name, cost, icon });
      fb.toast(existing ? 'Reward saved.' : 'Reward added.');
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
      await setRewardArchived(existing.id, !existing.archived);
      fb.toast(existing.archived ? `“${existing.name}” can be redeemed again.` : `“${existing.name}” archived. Past redemptions stay in history.`);
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
      title={existing ? 'Edit reward' : 'New reward'}
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
        <Field label="Reward" htmlFor="reward-name">
          <input id="reward-name" className="input" value={name} maxLength={60} placeholder="e.g. Skating at the mall" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Star cost">
          <Stepper label="Star cost" value={cost} onChange={setCost} />
        </Field>
        <EmojiPicker value={icon} onChange={setIcon} />
        {existing && <p className="muted small">A new cost applies from now on. Balances and past redemptions do not change.</p>}
        <ErrorNote>{error}</ErrorNote>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
