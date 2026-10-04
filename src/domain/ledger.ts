import type { Entry, Reward } from './types';

export function balanceOf(entries: readonly Entry[], childId: string): number {
  let sum = 0;
  for (const e of entries) if (e.childId === childId) sum += e.delta;
  return sum;
}

/** Stars an award/opening/correction version currently grants. */
export function grantedAmount(e: Entry): number {
  return e.amount ?? 0;
}

export function isCorrectable(e: Entry): boolean {
  return (e.type === 'award' || e.type === 'opening' || e.type === 'correction') && !e.supersededBy;
}

export function isReversible(e: Entry): boolean {
  return e.type === 'redemption' && !e.reversedBy;
}

export interface RewardProgress {
  reward: Reward;
  ready: boolean;
  remaining: number;
  /** 0..1, visually capped. */
  fraction: number;
}

export function activeRewardsByCost(rewards: readonly Reward[]): Reward[] {
  return rewards
    .filter((r) => !r.archived)
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
}

export function rewardProgress(balance: number, rewards: readonly Reward[]): RewardProgress[] {
  return activeRewardsByCost(rewards).map((reward) => ({
    reward,
    ready: balance >= reward.cost,
    remaining: Math.max(0, reward.cost - balance),
    fraction: Math.min(1, Math.max(0, balance / reward.cost)),
  }));
}

export function plural(n: number, word = 'star'): string {
  return `${n} ${word}${Math.abs(n) === 1 ? '' : 's'}`;
}

/** Short status line for a child's home card. */
export function rewardStatus(balance: number, rewards: readonly Reward[]): string {
  const progress = rewardProgress(balance, rewards);
  if (progress.length === 0) return 'No rewards yet';
  const ready = progress.filter((p) => p.ready);
  if (ready.length === progress.length) return progress.length === 1 ? `${progress[0].reward.name} is ready!` : 'All rewards available';
  const next = progress.find((p) => !p.ready)!;
  const toNext = `${plural(next.remaining, 'more star')} to ${lowerFirst(next.reward.name)}`;
  if (ready.length === 0) return toNext;
  const readyText = ready.length === 1 ? `${ready[0].reward.name} is ready!` : `${ready.length} rewards ready!`;
  return `${readyText} ${capFirst(toNext)}`;
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
