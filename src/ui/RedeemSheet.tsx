import { useState } from 'react';
import { Sheet, ErrorNote } from './controls';
import { Avatar } from './Avatar';
import { useFeedback } from './Feedback';
import { errorMessage, redeemReward, StarsError } from '../db/operations';
import { newId } from '../db/schema';
import { plural } from '../domain/ledger';
import type { Child, Reward } from '../domain/types';

/**
 * Confirmation for redeeming one reward. The cost Mum sees is captured when the
 * sheet opens; if the stored cost changes before she confirms, she is asked to
 * review the new numbers instead of being charged a price she didn't see.
 * Mount with a fresh `key` per opening.
 */
export function RedeemSheet({
  child,
  balance,
  reward,
  onClose,
}: {
  child: Child;
  balance: number;
  /** Live reward record. */
  reward: Reward;
  onClose: () => void;
}) {
  const fb = useFeedback();
  const [shownCost, setShownCost] = useState(reward.cost);
  const [opId, setOpId] = useState(newId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const costChanged = reward.cost !== shownCost;
  const archived = reward.archived;
  const left = balance - shownCost;
  const affordable = left >= 0;

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await redeemReward(child.id, reward.id, shownCost, opId);
      onClose();
      fb.celebrate();
      fb.toast(`${reward.name} redeemed for ${child.nickname}. ${plural(left)} left.`);
    } catch (err) {
      if (err instanceof StarsError && err.code === 'cost-changed') {
        // Stay open; the warning below asks Mum to review the new cost.
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  function reviewNewCost() {
    setShownCost(reward.cost);
    setOpId(newId());
    setError('');
  }

  return (
    <Sheet
      open
      onClose={onClose}
      accent={child.colour}
      title={
        <span className="sheet-child">
          <Avatar id={child.avatar} size={36} /> Redeem for {child.nickname}
        </span>
      }
      footer={
        <div className="btn-row">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          {costChanged && !archived ? (
            <button type="button" className="btn btn-primary" onClick={reviewNewCost}>
              Review new cost
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={saving || !affordable || archived} onClick={confirm}>
              {saving ? 'Saving…' : `Redeem for ${plural(shownCost)}`}
            </button>
          )}
        </div>
      }
    >
      <div className="redeem-summary">
        <div className="redeem-reward">
          <span className="redeem-icon" aria-hidden="true">
            {reward.icon ?? '🎁'}
          </span>
          <span>{reward.name}</span>
        </div>
        <p className="redeem-question">
          Redeem {reward.name.toLowerCase()} for {plural(shownCost)}? {child.nickname} has {plural(balance)}.{' '}
          {affordable ? (
            <>
              {child.nickname} will have <strong>{plural(left)}</strong> left.
            </>
          ) : (
            <strong>{plural(-left, 'more star')} needed.</strong>
          )}
        </p>
        <dl className="redeem-math" aria-label="Balance change">
          <div>
            <dt>Now</dt>
            <dd>{balance}</dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd>−{shownCost}</dd>
          </div>
          <div>
            <dt>Left</dt>
            <dd>{affordable ? left : '—'}</dd>
          </div>
        </dl>
      </div>
      {archived && <ErrorNote>This reward has been archived and can no longer be redeemed.</ErrorNote>}
      {costChanged && !archived && (
        <ErrorNote>
          The cost of {reward.name} has changed to {plural(reward.cost)}. Please review before redeeming.
        </ErrorNote>
      )}
      <ErrorNote>{error}</ErrorNote>
    </Sheet>
  );
}
