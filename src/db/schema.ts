import Dexie, { type Table } from 'dexie';
import type { Activity, Child, Entry, Reward, Settings } from '../domain/types';

export class StarsDB extends Dexie {
  children!: Table<Child, string>;
  activities!: Table<Activity, string>;
  rewards!: Table<Reward, string>;
  entries!: Table<Entry, string>;
  settings!: Table<Settings, string>;

  constructor(name = 'family-stars') {
    super(name);
    // Add new versions below; never edit a released version's stores.
    // Each version may include an .upgrade(tx => ...) to migrate records in place.
    this.version(1).stores({
      children: 'id',
      activities: 'id',
      rewards: 'id',
      entries: 'id, &opId, childId, at',
      settings: 'id',
    });
  }
}

export const db = new StarsDB();

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // randomUUID is unavailable on insecure origins (e.g. LAN testing over http).
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
