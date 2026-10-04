import { useState } from 'react';
import type { Family } from '../ui/data';
import { ChildCard } from '../ui/ChildCard';
import { AwardSheet } from '../ui/AwardSheet';

export function Home({ family }: { family: Family }) {
  const [awardFor, setAwardFor] = useState<string | null>(null);
  const child = family.children.find((c) => c.id === awardFor);

  return (
    <main className="screen" id="main">
      <h1 className="screen-title">Family Stars</h1>
      <div className="cards">
        {family.children.map((c) => (
          <ChildCard key={c.id} child={c} balance={family.balances[c.id] ?? 0} rewards={family.rewards} onAward={() => setAwardFor(c.id)} />
        ))}
      </div>
      {child && (
        <AwardSheet
          open
          child={child}
          balance={family.balances[child.id] ?? 0}
          activities={family.activities}
          onClose={() => setAwardFor(null)}
        />
      )}
    </main>
  );
}
