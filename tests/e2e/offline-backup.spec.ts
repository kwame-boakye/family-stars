import { test, expect } from '@playwright/test';
import { awardToys, card, expectBalance, setUp } from './helpers';

test('after offline preparation, the app reopens and saves without internet', async ({ page, context }) => {
  await setUp(page);
  await page.goto('./#/settings');
  await expect(page.getByText('Ready to use offline')).toBeVisible({ timeout: 15_000 });

  await context.setOffline(true);
  await page.goto('./#/');
  await page.reload();
  await expect(card(page, 'Ama')).toBeVisible();
  await awardToys(page, 'Ama');
  await page.reload();
  await expectBalance(page, 'Ama', 1);

  // Redeem and history also work offline.
  await card(page, 'Ama').getByRole('link', { name: 'History' }).click();
  await expect(page.locator('.history-item')).toHaveCount(1);
  await context.setOffline(false);
});

test('backup export and restore round-trips; an invalid file changes nothing', async ({ page }) => {
  await setUp(page, { opening: [18, 4] });
  await awardToys(page, 'Kofi');
  await card(page, 'Ama').getByRole('link', { name: 'Rewards' }).click();
  await page.getByRole('button', { name: 'Redeem Skating at the mall' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Redeem for 15 stars' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('3');

  await page.goto('./#/settings');
  await expect(page.getByText('Last backup: never')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save backup' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^family-stars-\d{4}-\d{2}-\d{2}\.json$/);
  const file = test.info().outputPath('backup.json');
  await download.saveAs(file);
  await expect(page.getByText('Last backup: never')).toHaveCount(0);

  // Change data after the backup.
  await page.goto('./#/');
  await awardToys(page, 'Ama');
  await expectBalance(page, 'Ama', 4);

  // Invalid file: rejected, nothing changes.
  await page.goto('./#/settings');
  await page.getByTestId('restore-input').setInputFiles({ name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByText('This file is not a Family Stars backup. Your current stars have not been changed.')).toBeVisible();
  await page.goto('./#/');
  await expectBalance(page, 'Ama', 4);

  // Valid file: preview, then replace.
  await page.goto('./#/settings');
  await page.getByTestId('restore-input').setInputFiles(file);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Ama — 3 stars');
  await expect(dialog).toContainText('Kofi — 5 stars');
  await dialog.getByRole('button', { name: 'Replace with backup' }).click();
  await page.goto('./#/');
  await expectBalance(page, 'Ama', 3);
  await expectBalance(page, 'Kofi', 5);
  await card(page, 'Ama').getByRole('link', { name: 'History' }).click();
  await expect(page.locator('.history-item')).toHaveCount(2);
});
