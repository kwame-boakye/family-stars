import { rewardProgress, plural } from '../domain/ledger';
import type { Reward } from '../domain/types';
import { href } from './router';

export function RewardProgressList({ balance, rewards, onRedeem }: { balance: number; rewards: Reward[]; onRedeem: (r: Reward) => void }) {
  const progress = rewardProgress(balance, rewards);
  if (progress.length === 0) {
    return (
      <div className="empty">
        <p>No rewards yet. Stars can still be earned and saved.</p>
        <a className="btn btn-primary" href={href({ name: 'rewards' })}>
          Add a reward
        </a>
      </div>
    );
  }
  const allReady = progress.every((p) => p.ready);
  return (
    <>
      {allReady && <p className="banner-good">All rewards available</p>}
      <ul className="reward-list">
        {progress.map(({ reward, ready, remaining, fraction }) => (
          <li key={reward.id} className={`reward-row ${ready ? 'is-ready' : ''}`}>
            <span className="reward-icon" aria-hidden="true">
              {reward.icon ?? '🎁'}
            </span>
            <div className="reward-main">
              <p className="reward-name">{reward.name}</p>
              <div
                className="bar"
                role="progressbar"
                aria-label={`Progress to ${reward.name}`}
                aria-valuemin={0}
                aria-valuemax={reward.cost}
                aria-valuenow={Math.min(balance, reward.cost)}
                aria-valuetext={ready ? 'Ready to redeem' : `${balance} of ${reward.cost} stars`}
              >
                <span className="bar-fill" style={{ width: `${Math.round(fraction * 100)}%` }} />
              </div>
              <p className="reward-meta">
                <span>{plural(reward.cost)}</span>
                <span className={ready ? 'ready-text' : ''}>{ready ? 'Ready to redeem' : `${plural(remaining, 'more star')} needed`}</span>
              </p>
            </div>
            {ready && (
              <button type="button" className="btn btn-primary btn-small" onClick={() => onRedeem(reward)} aria-label={`Redeem ${reward.name}`}>
                Redeem
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
