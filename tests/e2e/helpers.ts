import { expect, type Page } from '@playwright/test';

/** Completes first-time setup with two children and optional opening balances. */
export async function setUp(page: Page, opts: { names?: [string, string]; opening?: [number, number]; toysFor?: number[] } = {}) {
  const [a, b] = opts.names ?? ['Ama', 'Kofi'];
  await page.goto('./');
  await page.getByLabel('Nickname').nth(0).fill(a);
  await page.getByLabel('Nickname').nth(1).fill(b);
  if (opts.opening) {
    await page.getByLabel('Stars already earned on paper (optional)').nth(0).fill(String(opts.opening[0]));
    await page.getByLabel('Stars already earned on paper (optional)').nth(1).fill(String(opts.opening[1]));
  }
  await page.getByRole('button', { name: 'Next' }).click();
  // Assign "Put toys away" to the requested children (default: both).
  const toys = page.locator('.panel', { has: page.locator('input[value="Put toys away"]') });
  for (const i of opts.toysFor ?? [0, 1]) await toys.getByRole('checkbox').nth(i).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(card(page, a)).toBeVisible();
}

export function card(page: Page, name: string) {
  return page.getByRole('article', { name });
}

/** Waits until the child's card shows the expected balance. */
export async function expectBalance(page: Page, name: string, n: number) {
  await expect(card(page, name).locator('.balance-num')).toHaveText(String(n));
}

export async function awardToys(page: Page, name: string) {
  await card(page, name).getByRole('button', { name: 'Award stars' }).click();
  await page.getByRole('button', { name: /Put toys away/ }).click();
  await page.getByRole('button', { name: 'Award 1 star' }).click();
  await expect(page.locator('.toast')).toContainText(`${name} got 1 star`);
}
