import { test, expect, type Page } from '@playwright/test';
import { awardToys, setUp } from './helpers';

const T0 = new Date('2026-10-04T09:00:00Z');
const DAY = 86_400_000;
const reminder = (page: Page) => page.getByRole('region', { name: 'Time for a backup' });

/** Pretend the phone can share files; record what was shared. `mode` decides the user's response. */
async function fakeShareSheet(page: Page, mode: 'share' | 'cancel') {
  await page.addInitScript((mode) => {
    const w = window as unknown as { shared: { name: string; size: number }[] };
    w.shared = [];
    Object.defineProperty(navigator, 'canShare', { value: (d: ShareData) => !!d.files?.length, configurable: true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (d: ShareData) => {
        if (mode === 'cancel') throw new DOMException('Share canceled', 'AbortError');
        for (const f of d.files ?? []) w.shared.push({ name: f.name, size: f.size });
      },
    });
  }, mode);
}

test('reminder appears a week after unsaved stars, "Later" snoozes it, saving clears it', async ({ page }) => {
  await page.clock.install({ time: T0 });
  await setUp(page);
  await awardToys(page, 'Ama');
  await expect(reminder(page)).toHaveCount(0);

  await page.clock.setSystemTime(new Date(T0.getTime() + 8 * DAY));
  await page.reload();
  await expect(reminder(page)).toContainText('You haven’t saved a backup yet.');

  await reminder(page).getByRole('button', { name: 'Later' }).click();
  await expect(reminder(page)).toHaveCount(0);
  await page.clock.setSystemTime(new Date(T0.getTime() + 12 * DAY));
  await page.reload();
  await expect(reminder(page)).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent('download'), reminder(page).getByRole('button', { name: 'Save backup' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^family-stars-.*\.json$/);
  await expect(reminder(page)).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('Backup saved');
});

test('where sharing is supported, Save backup opens the share sheet with the file', async ({ page }) => {
  await fakeShareSheet(page, 'share');
  await setUp(page);
  await awardToys(page, 'Ama');
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Save backup' }).click();
  await expect(page.locator('.toast')).toContainText('Backup sent');
  const shared = await page.evaluate(() => (window as unknown as { shared: { name: string; size: number }[] }).shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].name).toMatch(/^family-stars-\d{4}-\d{2}-\d{2}\.json$/);
  expect(shared[0].size).toBeGreaterThan(100);
  await expect(page.getByText('Last backup: never')).toHaveCount(0);
});

test('closing the share sheet without sending does not count as a backup', async ({ page }) => {
  await fakeShareSheet(page, 'cancel');
  await setUp(page);
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Save backup' }).click();
  await expect(page.getByText('Last backup: never')).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
});
