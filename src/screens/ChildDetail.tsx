import { useState } from 'react';
import type { Family } from '../ui/data';
import { Avatar } from '../ui/Avatar';
import { BackIcon, StarIcon } from '../ui/icons';
import { AwardSheet } from '../ui/AwardSheet';
import { RedeemSheet } from '../ui/RedeemSheet';
import { CorrectionSheet } from '../ui/CorrectionSheet';
import { HistoryList } from '../ui/HistoryList';
import { RewardProgressList } from '../ui/RewardProgressList';
import { href } from '../ui/router';
import { plural } from '../domain/ledger';

// Each opening gets a fresh sheet instance (and operation id).
let sheetSeq = 0;

export function ChildDetail({ family, childId, view }: { family: Family; childId: string; view: 'rewards' | 'history' }) {
  const child = family.children.find((c) => c.id === childId);
  const [awarding, setAwarding] = useState(false);
  const [redeem, setRedeem] = useState<{ rewardId: string; n: number } | null>(null);
  const [correct, setCorrect] = useState<{ entryId: string; n: number } | null>(null);

  if (!child) {
    return (
      <main className="screen" id="main">
        <p>That child could not be found.</p>
        <a className="btn btn-soft" href="#/">
          Back to home
        </a>
      </main>
    );
  }

  const balance = family.balances[child.id] ?? 0;
  const entries = family.entries.filter((e) => e.childId === child.id);
  const redeemReward = redeem && family.rewards.find((r) => r.id === redeem.rewardId);
  const correctEntry = correct && entries.find((e) => e.id === correct.entryId);

  return (
    <main className={`screen accent-${child.colour}`} id="main">
      <header className="detail-head">
        <a className="icon-btn" href="#/" aria-label="Back to home">
          <BackIcon />
        </a>
        <Avatar id={child.avatar} size={56} />
        <div className="detail-id">
          <h1>{child.nickname}</h1>
          <p className="balance balance-sm" aria-label={plural(balance)}>
            <StarIcon size={26} />
            <span className="balance-num">{balance}</span>
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-small" onClick={() => setAwarding(true)}>
          <StarIcon size={18} /> Award
        </button>
      </header>

      <nav className="tabs" aria-label={`${child.nickname} sections`}>
        <a href={href({ name: 'child', childId: child.id, view: 'rewards' })} aria-current={view === 'rewards' ? 'page' : undefined}>
          Rewards
        </a>
        <a href={href({ name: 'child', childId: child.id, view: 'history' })} aria-current={view === 'history' ? 'page' : undefined}>
          History
        </a>
      </nav>

      {view === 'rewards' ? (
        <RewardProgressList balance={balance} rewards={family.rewards} onRedeem={(r) => setRedeem({ rewardId: r.id, n: ++sheetSeq })} />
      ) : (
        <HistoryList entries={entries} childName={child.nickname} onCorrect={(e) => setCorrect({ entryId: e.id, n: ++sheetSeq })} />
      )}

      {awarding && <AwardSheet open child={child} balance={balance} activities={family.activities} onClose={() => setAwarding(false)} />}
      {redeemReward && redeem && (
        <RedeemSheet key={redeem.n} child={child} balance={balance} reward={redeemReward} onClose={() => setRedeem(null)} />
      )}
      {correctEntry && correct && (
        <CorrectionSheet key={correct.n} child={child} balance={balance} entry={correctEntry} onClose={() => setCorrect(null)} />
      )}
    </main>
  );
}
