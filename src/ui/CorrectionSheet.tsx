import { useState } from 'react';
import { Sheet, Stepper, Field, ErrorNote, QuickReasons } from './controls';
import { useFeedback } from './Feedback';
import { correctEntry, errorMessage, reverseRedemption } from '../db/operations';
import { newId } from '../db/schema';
import { plural } from '../domain/ledger';
import type { Child, Entry } from '../domain/types';
import { formatDateTime } from './format';

const AWARD_REASONS = ['Tapped by mistake', 'Wrong child', 'Wrong amount'];
const REDEEM_REASONS = ['Tapped by mistake', 'Wrong child', 'Outing did not happen'];

/** Correct an award/opening balance (change or remove), or reverse a redemption. Mount with a fresh key. */
export function CorrectionSheet({ child, balance, entry, onClose }: { child: Child; balance: number; entry: Entry; onClose: () => void }) {
  const fb = useFeedback();
  const isRedemption = entry.type === 'redemption';
  const current = entry.amount ?? 0;
  const [mode, setMode] = useState<'remove' | 'change'>('remove');
  const [amount, setAmount] = useState(String(Math.max(1, current)));
  const [label, setLabel] = useState(entry.label);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [opId] = useState(newId);

  const newAmount = isRedemption ? 0 : mode === 'remove' ? 0 : Number(amount);
  const amountValid = mode === 'remove' || (Number.isInteger(newAmount) && newAmount >= 1 && newAmount <= 1000 && amount.trim() !== '');
  const effect = isRedemption ? -entry.delta : newAmount - current;
  const after = balance + (amountValid ? effect : 0);
  const negative = after < 0;
  const labelChanged = !isRedemption && mode === 'change' && label.trim() !== '' && label.trim() !== entry.label;
  const changed = isRedemption || effect !== 0 || labelChanged;
  const canSave = !saving && reason.trim() !== '' && amountValid && !negative && changed;

  async function save() {
    if (!canSave) {
      if (reason.trim() === '') setError('Please add a short reason for the correction.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isRedemption) {
        await reverseRedemption(entry.id, reason, opId);
        fb.toast(`Reward redemption reversed. ${plural(-entry.delta)} returned to ${child.nickname}.`);
      } else {
        await correctEntry(entry.id, { newAmount, newLabel: mode === 'change' ? label : undefined, reason }, opId);
        fb.toast(`Award corrected. ${child.nickname} now has ${plural(after)}.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const title = isRedemption ? 'Reverse reward redemption' : entry.type === 'opening' ? 'Correct opening balance' : 'Correct award';

  return (
    <Sheet
      open
      onClose={onClose}
      accent={child.colour}
      title={title}
      footer={
        <div className="btn-row">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSave && reason.trim() !== ''} onClick={save}>
            {saving ? 'Saving…' : isRedemption ? 'Reverse redemption' : 'Save correction'}
          </button>
        </div>
      }
    >
      <div className="correct-original">
        <p className="muted small">{formatDateTime(entry.at)}</p>
        <p>
          <strong>{entry.label}</strong> · {isRedemption ? `${plural(-entry.delta)} spent` : plural(current)} · {child.nickname}
        </p>
      </div>

      {!isRedemption && (
        <fieldset className="segmented">
          <legend className="sr-only">What should change?</legend>
          <button type="button" aria-pressed={mode === 'remove'} className={mode === 'remove' ? 'selected' : ''} onClick={() => setMode('remove')}>
            Remove it
          </button>
          <button type="button" aria-pressed={mode === 'change'} className={mode === 'change' ? 'selected' : ''} onClick={() => setMode('change')}>
            Change it
          </button>
        </fieldset>
      )}

      {!isRedemption && mode === 'change' && (
        <>
          <Field label="Correct number of stars" error={!amountValid ? 'Stars must be a whole number from 1 to 1000.' : undefined}>
            <Stepper label="Stars" value={amount} onChange={setAmount} />
          </Field>
          <Field label="What it was for" htmlFor="correct-label">
            <input id="correct-label" className="input" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
          </Field>
        </>
      )}

      <Field label="Reason for correction" htmlFor="correct-reason">
        <input
          id="correct-reason"
          className="input"
          value={reason}
          maxLength={60}
          placeholder="e.g. Tapped by mistake"
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <QuickReasons options={isRedemption ? REDEEM_REASONS : AWARD_REASONS} onPick={setReason} />

      <div className={`effect ${negative ? 'effect-bad' : ''}`} aria-live="polite">
        <span>{child.nickname}'s stars:</span>
        <strong>
          {balance} → {amountValid ? after : '?'}
        </strong>
      </div>
      {negative && (
        <ErrorNote>
          This would leave {child.nickname} with {after} stars, because some of these stars were already spent on a reward. If that reward
          redemption was also a mistake, reverse it first from the history. Otherwise, cancel.
        </ErrorNote>
      )}
      {!changed && <p className="muted small">Change the number of stars or the description to save a correction.</p>}
      <ErrorNote>{error}</ErrorNote>
    </Sheet>
  );
}
