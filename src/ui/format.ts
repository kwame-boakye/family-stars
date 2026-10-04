import { TIMEZONE } from '../domain/types';

const time = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true });
const day = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, weekday: 'short', day: 'numeric', month: 'short' });
const dayYear = new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatTime = (at: number) => time.format(at);
export const formatDate = (at: number) => dayYear.format(at);
export const formatDateTime = (at: number) => `${dayYear.format(at)}, ${time.format(at)}`;
export const dayKey = (at: number) => dayKeyFmt.format(at);

export function dayHeading(at: number, now = Date.now()): string {
  const k = dayKey(at);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(now - 86_400_000)) return 'Yesterday';
  return day.format(at);
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}
