import { describe, expect, it } from 'vitest';
import { parseOpeningBalance, parseStars } from '../../src/domain/validation';
import { rewardProgress, rewardStatus } from '../../src/domain/ledger';
import type { Reward } from '../../src/domain/types';

const reward = (name: string, cost: number, archived = false): Reward => ({ id: name, name, cost, archived, updatedAt: 1 });
const skating = reward('Skating', 15);
const eatOut = reward('Eat out', 20);

describe('parseStars', () => {
  it.each(['1', '15', ' 7 ', '1000'])('accepts %j', (v) => expect(parseStars(v).ok).toBe(true));
  it.each(['', '  ', '0', '-2', '1.5', '1e3', 'abc', '1001', '0x10', '99999999999999999999'])('rejects %j', (v) =>
    expect(parseStars(v).ok).toBe(false),
  );
  it('allows a blank or zero opening balance', () => {
    expect(parseOpeningBalance('')).toEqual({ ok: true, value: 0 });
    expect(parseOpeningBalance('0')).toEqual({ ok: true, value: 0 });
    expect(parseOpeningBalance('-1').ok).toBe(false);
  });
});

describe('reward progress', () => {
  it('orders by cost, caps the bar at 100% and ignores archived rewards', () => {
    const p = rewardProgress(18, [eatOut, reward('Old', 1, true), skating]);
    expect(p.map((x) => x.reward.name)).toEqual(['Skating', 'Eat out']);
    expect(p[0]).toMatchObject({ ready: true, remaining: 0, fraction: 1 });
    expect(p[1]).toMatchObject({ ready: false, remaining: 2, fraction: 0.9 });
  });

  it('writes friendly status lines', () => {
    expect(rewardStatus(12, [skating, eatOut])).toBe('3 more stars to skating');
    expect(rewardStatus(14, [skating, eatOut])).toBe('1 more star to skating');
    expect(rewardStatus(15, [skating, eatOut])).toBe('Skating is ready! 5 more stars to eat out');
    expect(rewardStatus(25, [skating, eatOut])).toBe('All rewards available');
    expect(rewardStatus(25, [skating])).toBe('Skating is ready!');
    expect(rewardStatus(5, [])).toBe('No rewards yet');
  });
});
