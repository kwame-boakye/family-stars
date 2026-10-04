import { Avatar } from './Avatar';
import { GiftIcon, HistoryIcon, StarIcon } from './icons';
import { rewardStatus, plural } from '../domain/ledger';
import { href } from './router';
import type { Child, Reward } from '../domain/types';

export function ChildCard({ child, balance, rewards, onAward }: { child: Child; balance: number; rewards: Reward[]; onAward: () => void }) {
  return (
    <article className={`child-card accent-${child.colour}`} aria-labelledby={`card-${child.id}`}>
      <div className="child-card-top">
        <Avatar id={child.avatar} size={72} />
        <div className="child-card-id">
          <h2 id={`card-${child.id}`}>{child.nickname}</h2>
          <p className="balance" aria-label={`${plural(balance)}`}>
            <StarIcon size={34} />
            <span className="balance-num">{balance}</span>
          </p>
        </div>
      </div>
      <p className="child-status">{rewardStatus(balance, rewards)}</p>
      <button type="button" className="btn btn-primary btn-block btn-award" onClick={onAward}>
        <StarIcon size={22} /> Award stars
      </button>
      <div className="child-links">
        <a className="btn btn-soft" href={href({ name: 'child', childId: child.id, view: 'rewards' })}>
          <GiftIcon size={20} /> Rewards
        </a>
        <a className="btn btn-soft" href={href({ name: 'child', childId: child.id, view: 'history' })}>
          <HistoryIcon size={20} /> History
        </a>
      </div>
    </article>
  );
}
