import { db, newId } from './schema';
import type { Activity, AvatarId, Child, ChildColour, Entry, Reward, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { isValidStarAmount, parseName, parseStars } from '../domain/validation';
import { isCorrectable, isReversible, plural } from '../domain/ledger';

export type StarsErrorCode =
  | 'invalid'
  | 'not-found'
  | 'archived'
  | 'not-enough-stars'
  | 'cost-changed'
  | 'would-go-negative'
  | 'already-corrected'
  | 'already-reversed'
  | 'no-change';

/** A rule violation with a message written for Mum. */
export class StarsError extends Error {
  constructor(
    public code: StarsErrorCode,
    message: string,
    public detail?: { currentCost?: number; balance?: number },
  ) {
    super(message);
    this.name = 'StarsError';
  }
}

export const SAVE_FAILED = 'Could not save—please try again.';

export function errorMessage(err: unknown): string {
  return err instanceof StarsError ? err.message : SAVE_FAILED;
}

export const DEFAULT_EXTRA_LABEL = 'Extra good deed';
export const UNDO_REASON = 'Accidental award';

async function balanceIn(childId: string): Promise<number> {
  let sum = 0;
  await db.entries.where('childId').equals(childId).each((e) => (sum += e.delta));
  return sum;
}

async function existingOp(opId: string): Promise<Entry | undefined> {
  return db.entries.where('opId').equals(opId).first();
}

async function requireChild(childId: string): Promise<Child> {
  const child = await db.children.get(childId);
  if (!child) throw new StarsError('not-found', 'That child could not be found.');
  return child;
}

function requireName(input: string, what: string): string {
  const r = parseName(input, what);
  if (!r.ok) throw new StarsError('invalid', r.error);
  return r.value;
}

function requireStars(input: number | string, what: string): number {
  const r = parseStars(input, what);
  if (!r.ok) throw new StarsError('invalid', r.error);
  return r.value;
}

// ---------- Awards ----------

export type AwardInput = { activityId: string } | { amount: number; note?: string };

export async function awardStars(childId: string, input: AwardInput, opId: string): Promise<Entry> {
  return db.transaction('rw', db.children, db.activities, db.entries, async () => {
    const prior = await existingOp(opId);
    if (prior) return prior;
    await requireChild(childId);

    let amount: number;
    let label: string;
    let activityId: string | undefined;
    if ('activityId' in input) {
      const activity = await db.activities.get(input.activityId);
      if (!activity) throw new StarsError('not-found', 'That activity could not be found.');
      if (activity.archived) throw new StarsError('archived', `“${activity.name}” has been archived.`);
      if (!activity.childIds.includes(childId)) throw new StarsError('invalid', `“${activity.name}” is not assigned to this child.`);
      amount = activity.stars;
      label = activity.name;
      activityId = activity.id;
    } else {
      amount = requireStars(input.amount, 'Stars');
      label = input.note?.trim() || DEFAULT_EXTRA_LABEL;
    }

    const entry: Entry = { id: newId(), opId, childId, type: 'award', delta: amount, amount, at: Date.now(), label, activityId };
    await db.entries.add(entry);
    return entry;
  });
}

// ---------- Redemptions ----------

export async function redeemReward(childId: string, rewardId: string, expectedCost: number, opId: string): Promise<Entry> {
  return db.transaction('rw', db.children, db.rewards, db.entries, async () => {
    const prior = await existingOp(opId);
    if (prior) return prior;
    await requireChild(childId);
    const reward = await db.rewards.get(rewardId);
    if (!reward) throw new StarsError('not-found', 'That reward could not be found.');
    if (reward.archived) throw new StarsError('archived', `“${reward.name}” has been archived and can no longer be redeemed.`);
    if (reward.cost !== expectedCost) {
      throw new StarsError('cost-changed', `The cost of “${reward.name}” changed to ${plural(reward.cost)}. Please review.`, {
        currentCost: reward.cost,
      });
    }
    const balance = await balanceIn(childId);
    if (balance < reward.cost) {
      const short = reward.cost - balance;
      throw new StarsError('not-enough-stars', `${plural(short, 'more star')} needed.`, { balance });
    }
    const entry: Entry = {
      id: newId(),
      opId,
      childId,
      type: 'redemption',
      delta: -reward.cost,
      at: Date.now(),
      label: reward.name,
      rewardId: reward.id,
      costSnapshot: reward.cost,
    };
    await db.entries.add(entry);
    return entry;
  });
}

export async function reverseRedemption(entryId: string, reason: string, opId: string): Promise<Entry> {
  return db.transaction('rw', db.entries, async () => {
    const prior = await existingOp(opId);
    if (prior) return prior;
    const why = requireName(reason, 'Reason');
    const redemption = await db.entries.get(entryId);
    if (!redemption || redemption.type !== 'redemption') throw new StarsError('not-found', 'That redemption could not be found.');
    if (!isReversible(redemption)) throw new StarsError('already-reversed', 'This redemption has already been reversed.');
    const reversal: Entry = {
      id: newId(),
      opId,
      childId: redemption.childId,
      type: 'reversal',
      delta: -redemption.delta,
      at: Date.now(),
      label: redemption.label,
      rewardId: redemption.rewardId,
      costSnapshot: redemption.costSnapshot,
      reversesId: redemption.id,
      correctionReason: why,
    };
    await db.entries.add(reversal);
    await db.entries.update(redemption.id, { reversedBy: reversal.id });
    return reversal;
  });
}

// ---------- Corrections ----------

/** `newAmount` 0 voids the award. */
export interface CorrectionInput {
  newAmount: number;
  newLabel?: string;
  reason: string;
}

export async function correctEntry(entryId: string, input: CorrectionInput, opId: string): Promise<Entry> {
  return db.transaction('rw', db.children, db.entries, async () => {
    const prior = await existingOp(opId);
    if (prior) return prior;
    const why = requireName(input.reason, 'Reason');
    const original = await db.entries.get(entryId);
    if (!original) throw new StarsError('not-found', 'That entry could not be found.');
    if (!isCorrectable(original)) {
      throw new StarsError('already-corrected', original.supersededBy ? 'This entry has already been corrected.' : 'Only awards can be corrected.');
    }
    if (input.newAmount !== 0 && !isValidStarAmount(input.newAmount)) {
      throw new StarsError('invalid', requireStarsMessage(input.newAmount));
    }
    const label = input.newLabel === undefined ? original.label : requireName(input.newLabel, 'Reason for the award');
    const delta = input.newAmount - (original.amount ?? 0);
    if (delta === 0 && label === original.label) throw new StarsError('no-change', 'Nothing has changed.');

    const child = await requireChild(original.childId);
    const balance = await balanceIn(original.childId);
    if (balance + delta < 0) {
      throw new StarsError(
        'would-go-negative',
        `This would leave ${child.nickname} with ${balance + delta} stars because some stars were already spent on rewards. ` +
          'If a reward redemption was also a mistake, reverse it first.',
        { balance },
      );
    }
    const correction: Entry = {
      id: newId(),
      opId,
      childId: original.childId,
      type: 'correction',
      delta,
      amount: input.newAmount,
      at: Date.now(),
      label,
      activityId: original.activityId,
      correctsId: original.id,
      correctionReason: why,
    };
    await db.entries.add(correction);
    await db.entries.update(original.id, { supersededBy: correction.id });
    return correction;
  });
}

function requireStarsMessage(n: number): string {
  const r = parseStars(n, 'Stars');
  return r.ok ? '' : r.error;
}

export function undoAward(entryId: string, opId: string): Promise<Entry> {
  return correctEntry(entryId, { newAmount: 0, reason: UNDO_REASON }, opId);
}

// ---------- Catalogue ----------

export interface ActivityInput {
  name: string;
  stars: number | string;
  icon?: string;
  childIds: string[];
}

function cleanActivity(input: ActivityInput) {
  if (input.childIds.length === 0) throw new StarsError('invalid', 'Choose at least one child.');
  return {
    name: requireName(input.name, 'Activity name'),
    stars: requireStars(input.stars, 'Stars'),
    icon: input.icon,
    childIds: [...new Set(input.childIds)],
  };
}

/** `id` is generated once per open form, so a double tap saves once. */
export async function saveActivity(id: string, input: ActivityInput): Promise<void> {
  const clean = cleanActivity(input);
  await db.transaction('rw', db.activities, async () => {
    const existing = await db.activities.get(id);
    await db.activities.put({ archived: false, ...existing, ...clean, id, updatedAt: Date.now() });
  });
}

export async function setActivityArchived(id: string, archived: boolean): Promise<void> {
  const n = await db.activities.update(id, { archived, updatedAt: Date.now() });
  if (!n) throw new StarsError('not-found', 'That activity could not be found.');
}

export interface RewardInput {
  name: string;
  cost: number | string;
  icon?: string;
}

export async function saveReward(id: string, input: RewardInput): Promise<void> {
  const clean = { name: requireName(input.name, 'Reward name'), cost: requireStars(input.cost, 'Star cost'), icon: input.icon };
  await db.transaction('rw', db.rewards, async () => {
    const existing = await db.rewards.get(id);
    await db.rewards.put({ archived: false, ...existing, ...clean, id, updatedAt: Date.now() });
  });
}

export async function setRewardArchived(id: string, archived: boolean): Promise<void> {
  const n = await db.rewards.update(id, { archived, updatedAt: Date.now() });
  if (!n) throw new StarsError('not-found', 'That reward could not be found.');
}

export async function updateChild(id: string, input: { nickname: string; avatar: AvatarId }): Promise<void> {
  const nickname = requireName(input.nickname, 'Nickname');
  const n = await db.children.update(id, { nickname, avatar: input.avatar });
  if (!n) throw new StarsError('not-found', 'That child could not be found.');
}

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    await db.settings.put({ ...current, ...patch, id: 'app' });
  });
}

// ---------- First-time setup ----------

export interface SetupChild {
  id: string;
  nickname: string;
  avatar: AvatarId;
  colour: ChildColour;
  openingBalance: number;
}

export interface SetupInput {
  children: SetupChild[];
  rewards: { name: string; cost: number | string }[];
  activities: ActivityInput[];
}

export async function completeSetup(input: SetupInput): Promise<void> {
  if (input.children.length === 0) throw new StarsError('invalid', 'Add at least one child.');
  const now = Date.now();
  // Offset createdAt so the children keep the order they were entered in.
  const children: Child[] = input.children.map((c, i) => ({
    id: c.id,
    nickname: requireName(c.nickname, 'Nickname'),
    avatar: c.avatar,
    colour: c.colour,
    createdAt: now + i,
  }));
  const openings: Entry[] = input.children
    .filter((c) => c.openingBalance !== 0)
    .map((c) => {
      const amount = requireStars(c.openingBalance, 'Existing stars');
      return { id: newId(), opId: `opening:${c.id}`, childId: c.id, type: 'opening', delta: amount, amount, at: now, label: 'Opening balance' };
    });
  const rewards: Reward[] = input.rewards.map((r) => ({
    id: newId(),
    name: requireName(r.name, 'Reward name'),
    cost: requireStars(r.cost, 'Star cost'),
    archived: false,
    updatedAt: now,
  }));
  const childIds = new Set(children.map((c) => c.id));
  const activities: Activity[] = input.activities.map((a) => {
    const clean = cleanActivity(a);
    if (clean.childIds.some((id) => !childIds.has(id))) throw new StarsError('invalid', 'Unknown child in activity assignment.');
    return { id: newId(), ...clean, archived: false, updatedAt: now };
  });

  await db.transaction('rw', [db.children, db.activities, db.rewards, db.entries, db.settings], async () => {
    const settings = await db.settings.get('app');
    if (settings?.setupDone) return; // already completed (e.g. double tap or another tab)
    await db.children.bulkAdd(children);
    await db.entries.bulkAdd(openings);
    await db.rewards.bulkAdd(rewards);
    await db.activities.bulkAdd(activities);
    await db.settings.put({ ...DEFAULT_SETTINGS, ...settings, setupDone: true, id: 'app' });
  });
}
