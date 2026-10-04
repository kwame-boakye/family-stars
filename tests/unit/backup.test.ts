import { describe, expect, it } from 'vitest';
import { db, newId } from '../../src/db/schema';
import { awardStars, completeSetup, correctEntry, redeemReward, reverseRedemption } from '../../src/db/operations';
import { buildBackup, parseBackup, restoreBackup } from '../../src/db/backup';
import { balanceOf } from '../../src/domain/ledger';

async function seed() {
  await completeSetup({
    children: [
      { id: 'a', nickname: 'Ama', avatar: 'lion', colour: 'coral', openingBalance: 4 },
      { id: 'b', nickname: 'Kofi', avatar: 'owl', colour: 'teal', openingBalance: 0 },
    ],
    rewards: [{ name: 'Skating at the mall', cost: 15 }],
    activities: [{ name: 'Put toys away', stars: 1, childIds: ['a', 'b'] }],
  });
  const skating = (await db.rewards.toArray())[0];
  const award = await awardStars('a', { amount: 14 }, newId());
  await correctEntry(award.id, { newAmount: 13, reason: 'Miscounted' }, newId());
  const r = await redeemReward('a', skating.id, 15, newId());
  await reverseRedemption(r.id, 'Mistake', newId());
  await redeemReward('a', skating.id, 15, newId());
  await awardStars('b', { amount: 2 }, newId());
}

async function snapshot() {
  const entries = await db.entries.orderBy('id').toArray();
  return {
    a: balanceOf(entries, 'a'),
    b: balanceOf(entries, 'b'),
    entries,
    children: await db.children.orderBy('id').toArray(),
    rewards: await db.rewards.toArray(),
    activities: await db.activities.toArray(),
  };
}

describe('backup and restore', () => {
  it('round-trips with identical balances and no duplicate history', async () => {
    await seed();
    const before = await snapshot();
    expect(before.a).toBe(2);
    const text = JSON.stringify(await buildBackup());

    // Change local data after the export, then restore over it.
    await awardStars('a', { amount: 9 }, newId());
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.preview.children).toEqual([
      { nickname: 'Ama', balance: 2 },
      { nickname: 'Kofi', balance: 2 },
    ]);
    await restoreBackup(parsed.preview.data);
    expect(await snapshot()).toEqual(before);

    // Restoring the same file twice still does not duplicate anything.
    await restoreBackup(parsed.preview.data);
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong format', JSON.stringify({ format: 'something-else' })],
    ['future version', 'FUTURE'],
    ['negative history', 'NEGATIVE'],
    ['broken reference', 'BROKEN'],
    ['bad star amount', 'BADCOST'],
  ])('rejects an invalid backup (%s) and leaves data intact', async (_name, kind) => {
    await seed();
    const before = await snapshot();
    const good = await buildBackup();
    let text = kind;
    if (kind === 'FUTURE') text = JSON.stringify({ ...good, version: 99 });
    if (kind === 'NEGATIVE') text = JSON.stringify({ ...good, entries: [...good.entries, { ...good.entries[0], id: 'x', opId: 'x', delta: -500, type: 'redemption' }] });
    if (kind === 'BROKEN') text = JSON.stringify({ ...good, activities: [{ ...good.activities[0], childIds: ['ghost'] }] });
    if (kind === 'BADCOST') text = JSON.stringify({ ...good, rewards: [{ ...good.rewards[0], cost: 2.5 }] });
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.length).toBeGreaterThan(0);
    expect(await snapshot()).toEqual(before);
  });
});
