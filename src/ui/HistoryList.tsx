import { useMemo } from 'react';
import type { Entry } from '../domain/types';
import { isCorrectable, isReversible, plural } from '../domain/ledger';
import { dayHeading, dayKey, formatTime, signed } from './format';
import { StarIcon } from './icons';

interface Row {
  entry: Entry;
  kind: string;
  title: string;
  detail?: string;
  status?: string;
  icon: string;
}

function describe(e: Entry, byId: Map<string, Entry>): Row {
  switch (e.type) {
    case 'award':
      return { entry: e, kind: 'Award', title: e.label, icon: '⭐' };
    case 'opening':
      return { entry: e, kind: 'Opening balance', title: 'Stars from the paper chart', icon: '📋' };
    case 'redemption':
      return { entry: e, kind: 'Reward redeemed', title: e.label, detail: `Cost ${plural(e.costSnapshot ?? -e.delta)}`, icon: '🎁' };
    case 'reversal':
      return { entry: e, kind: 'Reward redemption reversed', title: e.label, detail: e.correctionReason, icon: '↩️' };
    case 'correction': {
      const prev = e.correctsId ? byId.get(e.correctsId) : undefined;
      const from = prev?.amount ?? 0;
      const removed = (e.amount ?? 0) === 0;
      const what = removed ? `Removed (was ${plural(from)})` : from !== e.amount ? `${from} → ${plural(e.amount ?? 0)}` : 'Description changed';
      const labelNote = prev && prev.label !== e.label ? ` · was “${prev.label}”` : '';
      return {
        entry: e,
        kind: removed ? 'Award removed' : 'Award corrected',
        title: e.label,
        detail: `${what}${labelNote} · ${e.correctionReason ?? ''}`,
        icon: '✏️',
      };
    }
  }
}

export function HistoryList({
  entries,
  childName,
  onCorrect,
}: {
  entries: Entry[];
  childName: string;
  onCorrect: (e: Entry) => void;
}) {
  const groups = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.id, e]));
    const sorted = [...entries].sort((a, b) => b.at - a.at);
    const out: { key: string; heading: string; rows: Row[] }[] = [];
    for (const e of sorted) {
      const key = dayKey(e.at);
      let g = out[out.length - 1];
      if (!g || g.key !== key) out.push((g = { key, heading: dayHeading(e.at), rows: [] }));
      const row = describe(e, byId);
      if (e.supersededBy) row.status = 'Corrected later';
      if (e.reversedBy) row.status = 'Reversed later';
      g.rows.push(row);
    }
    return out;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="empty">
        <StarIcon size={40} />
        <p>No stars yet—add the first one.</p>
      </div>
    );
  }

  return (
    <div className="history" aria-label={`${childName}'s history`}>
      {groups.map((g) => (
        <section key={g.key} className="history-day">
          <h3 className="history-heading">{g.heading}</h3>
          <ul className="history-list">
            {g.rows.map(({ entry: e, kind, title, detail, status, icon }) => {
              const canFix = isCorrectable(e) || isReversible(e);
              return (
                <li key={e.id} className={`history-item type-${e.type} ${status ? 'is-replaced' : ''}`}>
                  <span className="history-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <div className="history-main">
                    <p className="history-kind">
                      {kind}
                      {status && <span className="tag">{status}</span>}
                    </p>
                    <p className="history-title">{title}</p>
                    {detail && <p className="history-detail">{detail}</p>}
                    <p className="history-time">{formatTime(e.at)}</p>
                  </div>
                  <div className="history-side">
                    <span className={`delta ${e.delta > 0 ? 'pos' : e.delta < 0 ? 'neg' : ''}`} aria-label={`${signed(e.delta)} stars`}>
                      {signed(e.delta)}
                    </span>
                    {canFix && (
                      <button type="button" className="link-btn" onClick={() => onCorrect(e)}>
                        Correct mistake
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
