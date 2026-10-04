import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import type { Activity, Child, Entry, Reward, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { balanceOf } from '../domain/ledger';

export interface Family {
  settings: Settings;
  children: Child[];
  activities: Activity[];
  rewards: Reward[];
  entries: Entry[];
  balances: Record<string, number>;
}

/**
 * Live view of all family data. Dexie re-runs this after any committed write,
 * including writes from other tabs, so the screen always reflects storage.
 */
export function useFamily(): Family | undefined {
  return useLiveQuery(async () => {
    const [settings, children, activities, rewards, entries] = await db.transaction(
      'r',
      [db.settings, db.children, db.activities, db.rewards, db.entries],
      () => Promise.all([db.settings.get('app'), db.children.orderBy('id').toArray(), db.activities.toArray(), db.rewards.toArray(), db.entries.orderBy('at').toArray()]),
    );
    children.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    const balances: Record<string, number> = {};
    for (const c of children) balances[c.id] = balanceOf(entries, c.id);
    return { settings: settings ?? DEFAULT_SETTINGS, children, activities, rewards, entries, balances };
  });
}
