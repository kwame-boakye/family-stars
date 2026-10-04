import { describe, expect, it } from 'vitest';
import { DAY, needsBackupReminder } from '../../src/domain/backupReminder';
import type { Entry } from '../../src/domain/types';

const T0 = Date.UTC(2026, 9, 1, 9);
const entry = (at: number): Entry => ({ id: String(at), opId: String(at), childId: 'a', type: 'award', delta: 1, amount: 1, at, label: 'x' });
const data = (...ats: number[]) => ({ entries: ats.map(entry), activities: [], rewards: [] });

describe('needsBackupReminder', () => {
  it('stays quiet with no history', () => {
    expect(needsBackupReminder({}, data(), T0 + 30 * DAY)).toBe(false);
  });
  it('waits a week after first use before the first reminder', () => {
    expect(needsBackupReminder({}, data(T0), T0 + 6 * DAY)).toBe(false);
    expect(needsBackupReminder({}, data(T0), T0 + 7 * DAY)).toBe(true);
  });
  it('stays quiet when nothing changed since the last backup, however old', () => {
    expect(needsBackupReminder({ lastBackupAt: T0 + DAY }, data(T0), T0 + 60 * DAY)).toBe(false);
  });
  it('reminds when there are new stars and the backup is a week old', () => {
    const s = { lastBackupAt: T0 };
    expect(needsBackupReminder(s, data(T0 + DAY), T0 + 6 * DAY)).toBe(false);
    expect(needsBackupReminder(s, data(T0 + DAY), T0 + 7 * DAY)).toBe(true);
  });
  it('counts catalogue edits as changes', () => {
    const d = { entries: [entry(T0 - DAY)], activities: [], rewards: [{ id: 'r', name: 'x', cost: 5, archived: false, updatedAt: T0 + DAY }] };
    expect(needsBackupReminder({ lastBackupAt: T0 }, d, T0 + 8 * DAY)).toBe(true);
  });
  it('"Later" hides it until the snooze ends', () => {
    const s = { lastBackupAt: T0, backupSnoozedUntil: T0 + 10 * DAY };
    expect(needsBackupReminder(s, data(T0 + DAY), T0 + 9 * DAY)).toBe(false);
    expect(needsBackupReminder(s, data(T0 + DAY), T0 + 10 * DAY)).toBe(true);
  });
});
