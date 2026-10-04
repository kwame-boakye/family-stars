import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Sheet, Stepper, Field, ErrorNote } from './controls';
import { Avatar } from './Avatar';
import { StarIcon } from './icons';
import { useFeedback } from './Feedback';
import { awardStars, DEFAULT_EXTRA_LABEL, errorMessage, undoAward } from '../db/operations';
import { newId } from '../db/schema';
import { parseStars } from '../domain/validation';
import { plural } from '../domain/ledger';
import type { Activity, Child, Entry } from '../domain/types';

type Choice = { kind: 'activity'; id: string } | { kind: 'extra' };

export function AwardSheet({
  child,
  balance,
  activities,
  open,
  onClose,
}: {
  child: Child;
  balance: number;
  activities: Activity[];
  open: boolean;
  onClose: () => void;
}) {
  const fb = useFeedback();
  const available = useMemo(
    () => activities.filter((a) => !a.archived && a.childIds.includes(child.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [activities, child.id],
  );
  const [choice, setChoice] = useState<Choice | null>(null);
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // One operation id per opened sheet, so a double tap records a single award.
  const [opId, setOpId] = useState(newId);

  useEffect(() => {
    if (open) {
      setChoice(available.length === 0 ? { kind: 'extra' } : null);
      setAmount('1');
      setNote('');
      setError('');
      setOpId(newId());
    }
    // Reset only when the sheet opens.
  }, [open]);

  const selected = choice?.kind === 'activity' ? available.find((a) => a.id === choice.id) : undefined;
  const parsedAmount = parseStars(amount, 'Stars');
  const stars = choice?.kind === 'extra' ? (parsedAmount.ok ? parsedAmount.value : null) : selected?.stars ?? null;

  async function submit() {
    if (saving || !choice) return;
    if (choice.kind === 'extra' && !parsedAmount.ok) {
      setError(parsedAmount.error);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const entry = await awardStars(
        child.id,
        choice.kind === 'activity' ? { activityId: choice.id } : { amount: parsedAmount.ok ? parsedAmount.value : 0, note },
        opId,
      );
      onClose();
      confirmAward(entry);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function confirmAward(entry: Entry) {
    const what = entry.label === DEFAULT_EXTRA_LABEL ? 'an extra good deed' : `“${entry.label}”`;
    const undoOp = newId();
    fb.celebrate();
    fb.announce(`${child.nickname} got ${plural(entry.delta)} for ${what}. ${child.nickname} now has ${plural(balance + entry.delta)}.`);
    fb.toast(`${child.nickname} got ${plural(entry.delta)} for ${what}`, {
      announce: false,
      action: {
        label: 'Undo',
        run: async () => {
          try {
            await undoAward(entry.id, undoOp);
            fb.toast(`Award undone. ${plural(entry.delta)} removed from ${child.nickname}.`);
          } catch (err) {
            fb.toast(errorMessage(err), { tone: 'error' });
          }
        },
      },
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      accent={child.colour}
      title={
        <span className="sheet-child">
          <Avatar id={child.avatar} size={36} /> Award stars to {child.nickname}
        </span>
      }
      footer={
        <button type="button" className="btn btn-primary btn-block" disabled={!choice || saving || stars === null} onClick={submit}>
          <StarIcon size={22} />
          {saving ? 'Saving…' : stars ? `Award ${plural(stars)}` : 'Award stars'}
        </button>
      }
    >
      {available.length > 0 && (
        <fieldset className="choice-list">
          <legend className="sr-only">Choose what the stars are for</legend>
          {available.map((a) => (
            <ChoiceButton key={a.id} selected={choice?.kind === 'activity' && choice.id === a.id} onClick={() => setChoice({ kind: 'activity', id: a.id })}>
              <span className="choice-icon" aria-hidden="true">
                {a.icon ?? '⭐'}
              </span>
              <span className="choice-name">{a.name}</span>
              <span className="choice-stars">{plural(a.stars)}</span>
            </ChoiceButton>
          ))}
          <ChoiceButton selected={choice?.kind === 'extra'} onClick={() => setChoice({ kind: 'extra' })}>
            <span className="choice-icon" aria-hidden="true">
              💛
            </span>
            <span className="choice-name">Extra good deed</span>
            <span className="choice-stars">You choose</span>
          </ChoiceButton>
        </fieldset>
      )}
      {available.length === 0 && <p className="muted">No saved activities for {child.nickname} yet. You can still award stars for a good deed.</p>}

      {choice?.kind === 'extra' && (
        <div className="extra-form">
          <Field label="How many stars?" error={amount.trim() !== '' && !parsedAmount.ok ? parsedAmount.error : undefined}>
            <Stepper label="Stars" value={amount} onChange={setAmount} />
          </Field>
          <Field label="What for? (optional)" htmlFor="award-note">
            <input id="award-note" className="input" value={note} maxLength={60} placeholder="Extra good deed" onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      )}
      <ErrorNote>{error}</ErrorNote>
    </Sheet>
  );
}

function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`choice ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}
