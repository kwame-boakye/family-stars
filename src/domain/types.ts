export type ID = string;

export interface Child {
  id: ID;
  nickname: string;
  avatar: AvatarId;
  colour: ChildColour;
  createdAt: number;
}

export type AvatarId = 'lion' | 'bunny' | 'bear' | 'owl' | 'cat' | 'turtle' | 'fox' | 'elephant';
export type ChildColour = 'coral' | 'teal' | 'violet' | 'leaf';

export interface Activity {
  id: ID;
  name: string;
  stars: number;
  icon?: string;
  childIds: ID[];
  archived: boolean;
  updatedAt: number;
}

export interface Reward {
  id: ID;
  name: string;
  cost: number;
  icon?: string;
  archived: boolean;
  updatedAt: number;
}

export type EntryType = 'award' | 'opening' | 'redemption' | 'correction' | 'reversal';

/**
 * One line in a child's append-only star ledger. A child's balance is the sum
 * of `delta` across all of their entries; corrections and reversals are new
 * entries carrying the difference, so nothing is ever counted twice.
 */
export interface Entry {
  id: ID;
  /** Unique per user intent; a repeated opId is a no-op. */
  opId: string;
  childId: ID;
  type: EntryType;
  delta: number;
  at: number;
  /** Activity name, discretionary note, reward name or correction reason. */
  label: string;
  activityId?: ID;
  rewardId?: ID;
  /** Reward cost at redemption time. */
  costSnapshot?: number;
  /**
   * For awards/openings/corrections: the number of stars this version grants.
   * A correction's `amount` is the replacement value; its delta is the difference.
   */
  amount?: number;
  /** Correction: the entry this one replaces. */
  correctsId?: ID;
  /** Correction: why Mum corrected it. */
  correctionReason?: string;
  /** Set on an award/opening/correction once a newer version replaces it. */
  supersededBy?: ID;
  /** Reversal: the redemption it undoes. */
  reversesId?: ID;
  /** Set on a redemption once reversed. */
  reversedBy?: ID;
}

export interface Settings {
  id: 'app';
  schemaVersion: number;
  timezone: string;
  celebrations: boolean;
  setupDone: boolean;
  lastBackupAt?: number;
}

export const SCHEMA_VERSION = 1;
export const TIMEZONE = 'Africa/Accra';
export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  schemaVersion: SCHEMA_VERSION,
  timezone: TIMEZONE,
  celebrations: true,
  setupDone: false,
};
