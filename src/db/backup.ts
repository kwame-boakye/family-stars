import { db } from './schema';
import type { Activity, AvatarId, Child, ChildColour, Entry, EntryType, Reward, Settings } from '../domain/types';
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../domain/types';
import { balanceOf } from '../domain/ledger';
import { isValidStarAmount } from '../domain/validation';

export const BACKUP_FORMAT = 'family-stars-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  children: Child[];
  activities: Activity[];
  rewards: Reward[];
  entries: Entry[];
  settings: { celebrations: boolean; timezone: string };
}

export interface BackupPreview {
  exportedAt: number;
  children: { nickname: string; balance: number }[];
  data: BackupFile;
}

export async function buildBackup(now = Date.now()): Promise<BackupFile> {
  return db.transaction('r', [db.children, db.activities, db.rewards, db.entries, db.settings], async () => {
    const settings = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now,
      children: await db.children.orderBy('id').toArray(),
      activities: await db.activities.toArray(),
      rewards: await db.rewards.toArray(),
      entries: await db.entries.orderBy('at').toArray(),
      settings: { celebrations: settings.celebrations, timezone: settings.timezone },
    };
  });
}

export function backupFileName(at: number): string {
  // en-CA formats as YYYY-MM-DD.
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  return `family-stars-${day}.json`;
}

/** Call after the file has been handed to the browser to save. */
export async function markBackedUp(at: number): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    await db.settings.put({ ...current, lastBackupAt: at });
  });
}

// ---------- Validation ----------

const AVATARS: readonly AvatarId[] = ['lion', 'bunny', 'bear', 'owl', 'cat', 'turtle', 'fox', 'elephant'];
const COLOURS: readonly ChildColour[] = ['coral', 'teal', 'violet', 'leaf'];
const TYPES: readonly EntryType[] = ['award', 'opening', 'redemption', 'correction', 'reversal'];

class BackupInvalid extends Error {}

function fail(msg: string): never {
  throw new BackupInvalid(msg);
}
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const optStr = (v: unknown) => v === undefined || typeof v === 'string';

function arr(v: unknown, what: string): unknown[] {
  if (!Array.isArray(v)) fail(`The backup is missing its ${what}.`);
  return v;
}

function uniqueIds(items: { id: string }[], what: string) {
  const seen = new Set<string>();
  for (const i of items) {
    if (seen.has(i.id)) fail(`The backup contains duplicate ${what}.`);
    seen.add(i.id);
  }
  return seen;
}

/**
 * Validates an entire backup without touching the database.
 * Returns a friendly error string for anything malformed or unsupported.
 */
export function parseBackup(text: string): { ok: true; preview: BackupPreview } | { ok: false; error: string } {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      fail('This file is not a Family Stars backup.');
    }
    if (!isObj(raw) || raw.format !== BACKUP_FORMAT) fail('This file is not a Family Stars backup.');
    if (!isInt(raw.version) || raw.version < 1) fail('This backup file is damaged.');
    if (raw.version > BACKUP_VERSION) fail('This backup was made by a newer version of Family Stars. Please update the app first.');
    if (!isTime(raw.exportedAt)) fail('This backup file is damaged.');

    const children = arr(raw.children, 'children').map((c): Child => {
      if (!isObj(c) || !isStr(c.id) || !isStr(c.nickname) || !AVATARS.includes(c.avatar as AvatarId) || !COLOURS.includes(c.colour as ChildColour) || !isTime(c.createdAt)) {
        fail('A child profile in the backup is damaged.');
      }
      return { id: c.id, nickname: c.nickname, avatar: c.avatar as AvatarId, colour: c.colour as ChildColour, createdAt: c.createdAt };
    });
    if (children.length === 0) fail('The backup has no children in it.');
    const childIds = uniqueIds(children, 'children');

    const activities = arr(raw.activities, 'activities').map((a): Activity => {
      if (
        !isObj(a) || !isStr(a.id) || !isStr(a.name) || !isValidStarAmount(a.stars) || !optStr(a.icon) ||
        !Array.isArray(a.childIds) || !a.childIds.every((id) => typeof id === 'string' && childIds.has(id)) ||
        typeof a.archived !== 'boolean' || !isTime(a.updatedAt)
      ) {
        fail('An activity in the backup is damaged.');
      }
      return { id: a.id, name: a.name, stars: a.stars, icon: a.icon as string | undefined, childIds: a.childIds as string[], archived: a.archived, updatedAt: a.updatedAt };
    });
    uniqueIds(activities, 'activities');

    const rewards = arr(raw.rewards, 'rewards').map((r): Reward => {
      if (!isObj(r) || !isStr(r.id) || !isStr(r.name) || !isValidStarAmount(r.cost) || !optStr(r.icon) || typeof r.archived !== 'boolean' || !isTime(r.updatedAt)) {
        fail('A reward in the backup is damaged.');
      }
      return { id: r.id, name: r.name, cost: r.cost, icon: r.icon as string | undefined, archived: r.archived, updatedAt: r.updatedAt };
    });
    uniqueIds(rewards, 'rewards');

    const entries = arr(raw.entries, 'history').map((e): Entry => {
      if (!isObj(e) || !isStr(e.id) || !isStr(e.opId) || !isStr(e.childId) || !childIds.has(e.childId) || !TYPES.includes(e.type as EntryType) ||
        !isInt(e.delta) || !isTime(e.at) || typeof e.label !== 'string') {
        fail('A history entry in the backup is damaged.');
      }
      const optional = ['activityId', 'rewardId', 'correctsId', 'correctionReason', 'supersededBy', 'reversesId', 'reversedBy'] as const;
      if (!optional.every((k) => optStr(e[k])) || !(e.amount === undefined || isInt(e.amount)) || !(e.costSnapshot === undefined || isInt(e.costSnapshot))) {
        fail('A history entry in the backup is damaged.');
      }
      const out: Entry = { id: e.id, opId: e.opId, childId: e.childId, type: e.type as EntryType, delta: e.delta, at: e.at, label: e.label };
      for (const k of optional) if (e[k] !== undefined) out[k] = e[k] as string;
      if (e.amount !== undefined) out.amount = e.amount as number;
      if (e.costSnapshot !== undefined) out.costSnapshot = e.costSnapshot as number;
      return out;
    });
    const entryIds = uniqueIds(entries, 'history entries');
    const opIds = new Set<string>();
    for (const e of entries) {
      if (opIds.has(e.opId)) fail('The backup contains duplicate history entries.');
      opIds.add(e.opId);
      for (const link of [e.correctsId, e.supersededBy, e.reversesId, e.reversedBy]) {
        if (link !== undefined && !entryIds.has(link)) fail('The backup history has a broken link.');
      }
    }

    const balances = children.map((c) => ({ nickname: c.nickname, balance: balanceOf(entries, c.id) }));
    if (balances.some((b) => b.balance < 0)) fail('The backup history does not add up.');

    const s = isObj(raw.settings) ? raw.settings : {};
    const data: BackupFile = {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: raw.exportedAt,
      children,
      activities,
      rewards,
      entries,
      settings: {
        celebrations: typeof s.celebrations === 'boolean' ? s.celebrations : true,
        timezone: typeof s.timezone === 'string' ? s.timezone : DEFAULT_SETTINGS.timezone,
      },
    };
    return { ok: true, preview: { exportedAt: data.exportedAt, children: balances, data } };
  } catch (err) {
    if (err instanceof BackupInvalid) return { ok: false, error: err.message };
    return { ok: false, error: 'This backup file could not be read.' };
  }
}

/** Replaces all local data with a validated backup in one atomic transaction. */
export async function restoreBackup(data: BackupFile): Promise<void> {
  await db.transaction('rw', [db.children, db.activities, db.rewards, db.entries, db.settings], async () => {
    const current = await db.settings.get('app');
    await Promise.all([db.children.clear(), db.activities.clear(), db.rewards.clear(), db.entries.clear()]);
    await db.children.bulkAdd(data.children);
    await db.activities.bulkAdd(data.activities);
    await db.rewards.bulkAdd(data.rewards);
    await db.entries.bulkAdd(data.entries);
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ...current,
      id: 'app',
      schemaVersion: SCHEMA_VERSION,
      celebrations: data.settings.celebrations,
      timezone: data.settings.timezone,
      setupDone: true,
      // The restored data is exactly what this backup file holds.
      lastBackupAt: data.exportedAt,
    };
    await db.settings.put(settings);
  });
}
