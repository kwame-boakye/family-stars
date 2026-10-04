export const MAX_STARS = 1000;
export const MAX_NAME = 60;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Parses a positive whole number of stars from user input.
 * Rejects blanks, zero, negatives, fractions, exponents and huge values.
 */
export function parseStars(input: string | number, what = 'Stars'): Parsed<number> {
  const raw = typeof input === 'number' ? String(input) : input.trim();
  if (raw === '') return { ok: false, error: `${what} cannot be blank.` };
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return { ok: false, error: `${what} must be a whole number, like 1 or 5.` };
  const n = Number(raw);
  if (!Number.isInteger(n)) return { ok: false, error: `${what} must be a whole number, like 1 or 5.` };
  if (n <= 0) return { ok: false, error: `${what} must be at least 1.` };
  if (n > MAX_STARS) return { ok: false, error: `${what} can be at most ${MAX_STARS}.` };
  return { ok: true, value: n };
}

/** Like parseStars but allows 0 (used for optional opening balances). */
export function parseOpeningBalance(input: string): Parsed<number> {
  const raw = input.trim();
  if (raw === '' || raw === '0') return { ok: true, value: 0 };
  return parseStars(raw, 'Existing stars');
}

export function parseName(input: string, what = 'Name'): Parsed<string> {
  const v = input.trim().replace(/\s+/g, ' ');
  if (v === '') return { ok: false, error: `${what} cannot be blank.` };
  if (v.length > MAX_NAME) return { ok: false, error: `${what} can be at most ${MAX_NAME} characters.` };
  return { ok: true, value: v };
}

export function isValidStarAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= MAX_STARS;
}
