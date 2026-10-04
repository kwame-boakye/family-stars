import { describe, expect, it, vi } from 'vitest';
import { db, newId } from '../../src/db/schema';
import {
  awardStars,
  completeSetup,
  correctEntry,
  redeemReward,
  reverseRedemption,
  saveActivity,
  saveReward,
  setActivityArchived,
  setRewardArchived,
  StarsError,
  undoAward,
} from '../../src/db/operations';
import { balanceOf, rewardProgress } from '../../src/domain/ledger';

const A = 'child-a';
const B = 'child-b';

async function setup(opening: [number, number] = [0, 0]) {
  await completeSetup({
    children: [
      { id: A, nickname: 'Ama', avatar: 'lion', colour: 'coral', openingBalance: opening[0] },
      { id: B, nickname: 'Kofi', avatar: 'bunny', colour: 'teal', openingBalance: opening[1] },
    ],
    rewards: [
      { name: 'Skating at the mall', cost: 15 },
      { name: 'Eat out', cost: 20 },
    ],
    activities: [{ name: 'Put toys away', stars: 1, childIds: [A, B] }],
  });
  const rewards = await db.rewards.toArray();
  return {
    skating: rewards.find((r) => r.name.startsWith('Skating'))!,
    eatOut: rewards.find((r) => r.name === 'Eat out')!,
    toys: (await db.activities.toArray())[0],
  };
}

async function balance(childId: string) {
  return balanceOf(await db.entries.toArray(), childId);
}

async function giveStars(childId: string, n: number) {
  if (n > 0) await awardStars(childId, { amount: n }, newId());
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(StarsError);
  await p.catch((e: StarsError) => expect(e.code).toBe(code));
}

describe('awarding', () => {
  it('awards a saved one-star activity to only the chosen child', async () => {
    const { toys } = await setup();
    const e = await awardStars(A, { activityId: toys.id }, newId());
    expect(await balance(A)).toBe(1);
    expect(await balance(B)).toBe(0);
    expect(e.label).toBe('Put toys away');
    expect(e.activityId).toBe(toys.id);
  });

  it('awards discretionary stars and keeps the note', async () => {
    await setup();
    const e = await awardStars(A, { amount: 3, note: 'Shared snacks with her brother' }, newId());
    expect(await balance(A)).toBe(3);
    expect(e.label).toBe('Shared snacks with her brother');
  });

  it('uses "Extra good deed" when no note is given', async () => {
    await setup();
    const e = await awardStars(A, { amount: 1, note: '   ' }, newId());
    expect(e.label).toBe('Extra good deed');
  });

  it.each([0, -1, 1.5, NaN, 1001, Number.MAX_SAFE_INTEGER + 2])('rejects invalid amount %s', async (amount) => {
    await setup();
    await expectCode(awardStars(A, { amount }, newId()), 'invalid');
    expect(await db.entries.count()).toBe(0);
  });

  it('records one award for a repeated operation id (double tap)', async () => {
    const { toys } = await setup();
    const op = newId();
    await Promise.all([awardStars(A, { activityId: toys.id }, op), awardStars(A, { activityId: toys.id }, op)]);
    await awardStars(A, { activityId: toys.id }, op);
    expect(await balance(A)).toBe(1);
    expect(await db.entries.count()).toBe(1);
  });

  it('keeps the original activity name and amount when the activity is edited', async () => {
    const { toys } = await setup();
    const first = await awardStars(A, { activityId: toys.id }, newId());
    await saveActivity(toys.id, { name: 'Tidy bedroom', stars: 2, childIds: [A, B] });
    const second = await awardStars(A, { activityId: toys.id }, newId());
    expect((await db.entries.get(first.id))!.label).toBe('Put toys away');
    expect((await db.entries.get(first.id))!.delta).toBe(1);
    expect(second.label).toBe('Tidy bedroom');
    expect(await balance(A)).toBe(3);
  });

  it('does not award an archived activity or one not assigned to the child', async () => {
    const { toys } = await setup();
    await saveActivity('hw', { name: 'Finish homework', stars: 2, childIds: [A] });
    await expectCode(awardStars(B, { activityId: 'hw' }, newId()), 'invalid');
    await setActivityArchived(toys.id, true);
    await expectCode(awardStars(A, { activityId: toys.id }, newId()), 'archived');
  });

  it('writes nothing when the save fails', async () => {
    await setup();
    const spy = vi.spyOn(db.entries, 'add').mockRejectedValueOnce(new Error('QuotaExceededError'));
    await expect(awardStars(A, { amount: 2 }, newId())).rejects.toThrow();
    spy.mockRestore();
    expect(await db.entries.count()).toBe(0);
    expect(await balance(A)).toBe(0);
  });
});

describe('redeeming', () => {
  it.each([
    [15, 'skating', 0],
    [18, 'skating', 3],
    [20, 'eatOut', 0],
    [22, 'skating', 7],
  ] as const)('from %i stars, redeeming %s leaves %i', async (start, which, left) => {
    const rewards = await setup();
    await giveStars(A, start);
    const reward = rewards[which];
    const e = await redeemReward(A, reward.id, reward.cost, newId());
    expect(e.delta).toBe(-reward.cost);
    expect(await balance(A)).toBe(left);
  });

  it('blocks skating at 14 stars with "1 more star needed"', async () => {
    const { skating } = await setup();
    await giveStars(A, 14);
    const p = redeemReward(A, skating.id, 15, newId());
    await expectCode(p, 'not-enough-stars');
    await p.catch((e: StarsError) => expect(e.message).toBe('1 more star needed.'));
    expect(await balance(A)).toBe(14);
  });

  it('with 20 stars, skating leaves 5 and eating out is no longer affordable', async () => {
    const { skating, eatOut } = await setup();
    await giveStars(A, 20);
    await redeemReward(A, skating.id, 15, newId());
    expect(await balance(A)).toBe(5);
    const progress = rewardProgress(5, [skating, eatOut]);
    expect(progress.find((p) => p.reward.id === eatOut.id)!.ready).toBe(false);
    await expectCode(redeemReward(A, eatOut.id, 20, newId()), 'not-enough-stars');
  });

  it("never changes the other child's balance", async () => {
    const { skating } = await setup([16, 9]);
    await redeemReward(A, skating.id, 15, newId());
    expect(await balance(A)).toBe(1);
    expect(await balance(B)).toBe(9);
  });

  it('records one redemption for a double tap', async () => {
    const { skating } = await setup([40, 0]);
    const op = newId();
    await Promise.allSettled([redeemReward(A, skating.id, 15, op), redeemReward(A, skating.id, 15, op)]);
    expect(await db.entries.filter((e) => e.type === 'redemption').count()).toBe(1);
    expect(await balance(A)).toBe(25);
  });

  it('prevents overspending from two stale screens with different operations', async () => {
    const { skating } = await setup([18, 0]);
    const results = await Promise.allSettled([redeemReward(A, skating.id, 15, newId()), redeemReward(A, skating.id, 15, newId())]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await balance(A)).toBe(3);
  });

  it('asks for review when the cost changed after the confirmation opened', async () => {
    const { skating } = await setup([30, 0]);
    await saveReward(skating.id, { name: skating.name, cost: 12 });
    const p = redeemReward(A, skating.id, 15, newId());
    await expectCode(p, 'cost-changed');
    await p.catch((e: StarsError) => expect(e.detail?.currentCost).toBe(12));
    expect(await balance(A)).toBe(30);
    await redeemReward(A, skating.id, 12, newId());
    expect(await balance(A)).toBe(18);
  });

  it('cannot redeem an archived reward', async () => {
    const { skating } = await setup([30, 0]);
    await setRewardArchived(skating.id, true);
    await expectCode(redeemReward(A, skating.id, 15, newId()), 'archived');
    expect(await db.rewards.count()).toBe(2);
  });

  it.each(['0', '-3', '2.5', '', 'abc'])('rejects reward cost %j', async (cost) => {
    const { skating } = await setup();
    await expectCode(saveReward(skating.id, { name: 'Skating', cost }), 'invalid');
    expect((await db.rewards.get(skating.id))!.cost).toBe(15);
  });

  it('a price change keeps past redemptions, and reversal restores the original amount once', async () => {
    const { skating } = await setup([18, 0]);
    const redemption = await redeemReward(A, skating.id, 15, newId());
    await saveReward(skating.id, { name: skating.name, cost: 25 });
    const stored = (await db.entries.get(redemption.id))!;
    expect(stored.delta).toBe(-15);
    expect(stored.costSnapshot).toBe(15);
    expect(await balance(A)).toBe(3);
    expect(rewardProgress(3, await db.rewards.toArray())[0].remaining).toBe(17);

    const op = newId();
    await reverseRedemption(redemption.id, 'Outing was cancelled', op);
    await reverseRedemption(redemption.id, 'Outing was cancelled', op);
    await expectCode(reverseRedemption(redemption.id, 'Again', newId()), 'already-reversed');
    expect(await balance(A)).toBe(18);
    expect((await db.entries.get(redemption.id))!.reversedBy).toBeDefined();
  });
});

describe('corrections', () => {
  it('replaces an award amount; history keeps both but counts once', async () => {
    await setup();
    const award = await awardStars(A, { amount: 3 }, newId());
    const correction = await correctEntry(award.id, { newAmount: 1, reason: 'Typed 3 instead of 1' }, newId());
    expect(correction.delta).toBe(-2);
    expect(await balance(A)).toBe(1);
    expect((await db.entries.get(award.id))!.supersededBy).toBe(correction.id);
    expect(await db.entries.count()).toBe(2);
  });

  it('voids an award and can correct the effective version again without double counting', async () => {
    await setup();
    const award = await awardStars(A, { amount: 2 }, newId());
    const v2 = await correctEntry(award.id, { newAmount: 5, reason: 'Was a bigger help' }, newId());
    expect(await balance(A)).toBe(5);
    await expectCode(correctEntry(award.id, { newAmount: 1, reason: 'x' }, newId()), 'already-corrected');
    await correctEntry(v2.id, { newAmount: 0, reason: 'Wrong child' }, newId());
    expect(await balance(A)).toBe(0);
  });

  it('applies a repeated correction only once', async () => {
    await setup();
    const award = await awardStars(A, { amount: 4 }, newId());
    const op = newId();
    await Promise.allSettled([
      correctEntry(award.id, { newAmount: 1, reason: 'Mistake' }, op),
      correctEntry(award.id, { newAmount: 1, reason: 'Mistake' }, op),
    ]);
    expect(await balance(A)).toBe(1);
    expect(await db.entries.filter((e) => e.type === 'correction').count()).toBe(1);
  });

  it('blocks a correction that would make the balance negative and leaves data unchanged', async () => {
    const { skating } = await setup();
    const award = await awardStars(A, { amount: 15 }, newId());
    await redeemReward(A, skating.id, 15, newId());
    const before = await db.entries.toArray();
    const p = correctEntry(award.id, { newAmount: 0, reason: 'Wrong child' }, newId());
    await expectCode(p, 'would-go-negative');
    expect(await db.entries.toArray()).toEqual(before);
  });

  it('allows that correction after the mistaken redemption is reversed', async () => {
    const { skating } = await setup();
    const award = await awardStars(A, { amount: 15 }, newId());
    const redemption = await redeemReward(A, skating.id, 15, newId());
    await reverseRedemption(redemption.id, 'Also a mistake', newId());
    await correctEntry(award.id, { newAmount: 0, reason: 'Wrong child' }, newId());
    expect(await balance(A)).toBe(0);
  });

  it('requires a reason and rejects invalid replacement amounts', async () => {
    await setup();
    const award = await awardStars(A, { amount: 3 }, newId());
    await expectCode(correctEntry(award.id, { newAmount: 1, reason: '  ' }, newId()), 'invalid');
    await expectCode(correctEntry(award.id, { newAmount: -1, reason: 'x' }, newId()), 'invalid');
    await expectCode(correctEntry(award.id, { newAmount: 2.5, reason: 'x' }, newId()), 'invalid');
    await expectCode(correctEntry(award.id, { newAmount: 3, reason: 'x' }, newId()), 'no-change');
    expect(await balance(A)).toBe(3);
  });

  it('cannot correct a redemption (use reversal instead)', async () => {
    const { skating } = await setup([15, 0]);
    const r = await redeemReward(A, skating.id, 15, newId());
    await expectCode(correctEntry(r.id, { newAmount: 0, reason: 'x' }, newId()), 'already-corrected');
  });

  it('undo voids the award with the "Accidental award" reason', async () => {
    const { toys } = await setup();
    const award = await awardStars(A, { activityId: toys.id }, newId());
    const undo = await undoAward(award.id, newId());
    expect(undo.correctionReason).toBe('Accidental award');
    expect(await balance(A)).toBe(0);
  });
});

describe('setup and archiving', () => {
  it('records opening balances as explainable, correctable entries', async () => {
    await setup([7, 0]);
    const entries = await db.entries.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ type: 'opening', delta: 7, label: 'Opening balance', childId: A });
    await correctEntry(entries[0].id, { newAmount: 6, reason: 'Miscounted' }, newId());
    expect(await balance(A)).toBe(6);
  });

  it('keeps children in the order they were entered', async () => {
    await setup();
    const kids = (await db.children.toArray()).sort((a, b) => a.createdAt - b.createdAt);
    expect(kids.map((k) => k.nickname)).toEqual(['Ama', 'Kofi']);
  });

  it('runs setup only once', async () => {
    await setup([3, 0]);
    await setup([3, 0]);
    expect(await db.children.count()).toBe(2);
    expect(await db.rewards.count()).toBe(2);
    expect(await balance(A)).toBe(3);
  });

  it('archived activities and rewards keep their history', async () => {
    const { toys, skating } = await setup();
    await awardStars(A, { activityId: toys.id }, newId());
    await giveStars(A, 15);
    await redeemReward(A, skating.id, 15, newId());
    await setActivityArchived(toys.id, true);
    await setRewardArchived(skating.id, true);
    const entries = await db.entries.toArray();
    expect(entries.map((e) => e.label)).toEqual(expect.arrayContaining(['Put toys away', 'Skating at the mall']));
    expect(await balance(A)).toBe(1);
  });
});
