import { test, expect } from '@playwright/test';
import { awardToys, card, expectBalance, setUp } from './helpers';

test('award a saved activity to one child only, and see it in history', async ({ page }) => {
  await setUp(page);
  await awardToys(page, 'Ama');
  await expect(page.locator('.toast-msg')).toHaveText('Ama got 1 star for “Put toys away”');
  await expect(page.getByText('Ama now has 1 star.')).toBeAttached();
  await expectBalance(page, 'Ama', 1);
  await expectBalance(page, 'Kofi', 0);

  await card(page, 'Ama').getByRole('link', { name: 'History' }).click();
  await expect(page.locator('.history-item')).toHaveCount(1);
  await expect(page.locator('.history-item')).toContainText('Put toys away');
  await expect(page.locator('.history-item')).toContainText('+1');
});

test('discretionary award keeps its note; invalid amounts are blocked', async ({ page }) => {
  await setUp(page);
  await card(page, 'Kofi').getByRole('button', { name: 'Award stars' }).click();
  await page.getByRole('button', { name: /Extra good deed/ }).click();
  await page.getByLabel('Stars', { exact: true }).fill('0');
  await expect(page.getByText('Stars must be at least 1.')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Award stars' })).toBeDisabled();
  await page.getByLabel('Stars', { exact: true }).fill('1.5');
  await expect(page.getByText('Stars must be a whole number, like 1 or 5.')).toBeVisible();
  await page.getByLabel('Stars', { exact: true }).fill('3');
  await page.getByLabel('What for? (optional)').fill('Helped carry shopping');
  await page.getByRole('button', { name: 'Award 3 stars' }).click();
  await expectBalance(page, 'Kofi', 3);
  await card(page, 'Kofi').getByRole('link', { name: 'History' }).click();
  await expect(page.locator('.history-item')).toContainText('Helped carry shopping');
});

test('redeem skating from 18 stars leaves 3; reward costs stay correct', async ({ page }) => {
  await setUp(page, { opening: [18, 14] });
  await expect(card(page, 'Ama')).toContainText('Skating at the mall is ready!');
  await expect(card(page, 'Kofi')).toContainText('1 more star to skating at the mall');

  // 14 stars: skating is not redeemable.
  await card(page, 'Kofi').getByRole('link', { name: 'Rewards' }).click();
  await expect(page.getByRole('button', { name: /Redeem/ })).toHaveCount(0);
  await expect(page.getByText('1 more star needed')).toBeVisible();

  await page.goto('./#/');
  await card(page, 'Ama').getByRole('link', { name: 'Rewards' }).click();
  await page.getByRole('button', { name: 'Redeem Skating at the mall' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Redeem skating at the mall for 15 stars? Ama has 18 stars. Ama will have 3 stars left.');

  // Cancel changes nothing.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('18');

  await page.getByRole('button', { name: 'Redeem Skating at the mall' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Redeem for 15 stars' }).dblclick();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('3');
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.locator('.history-item.type-redemption')).toHaveCount(1);

  // Kofi unchanged.
  await page.goto('./#/');
  await expectBalance(page, 'Kofi', 14);
});

test('double-tapping award records one award', async ({ page }) => {
  await setUp(page);
  await card(page, 'Ama').getByRole('button', { name: 'Award stars' }).click();
  await page.getByRole('button', { name: /Put toys away/ }).click();
  await page.getByRole('button', { name: 'Award 1 star' }).dblclick();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectBalance(page, 'Ama', 1);
});

test('undo and correction flows keep history honest', async ({ page }) => {
  await setUp(page);
  await awardToys(page, 'Ama');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Award undone')).toBeVisible();
  await expectBalance(page, 'Ama', 0);

  // Award 3 then correct to 1.
  await card(page, 'Ama').getByRole('button', { name: 'Award stars' }).click();
  await page.getByRole('button', { name: /Extra good deed/ }).click();
  await page.getByLabel('Stars', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Award 3 stars' }).click();
  await card(page, 'Ama').getByRole('link', { name: 'History' }).click();
  await page.locator('.history-item', { hasText: 'Extra good deed' }).first().getByRole('button', { name: 'Correct mistake' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Change it' }).click();
  await dialog.getByLabel('Stars', { exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Wrong amount' }).click();
  await expect(dialog.locator('.effect')).toContainText('3 → 1');
  await dialog.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('1');
  await expect(page.getByText('Award corrected').first()).toBeVisible();
  await expect(page.getByText('Corrected later').first()).toBeVisible();
});

test('correction that would go negative is blocked; reversing the redemption first allows it', async ({ page }) => {
  await setUp(page);
  await card(page, 'Ama').getByRole('button', { name: 'Award stars' }).click();
  await page.getByRole('button', { name: /Extra good deed/ }).click();
  await page.getByLabel('Stars', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Award 15 stars' }).click();
  await card(page, 'Ama').getByRole('link', { name: 'Rewards' }).click();
  await page.getByRole('button', { name: 'Redeem Skating at the mall' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Redeem for 15 stars' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('0');

  await page.getByRole('link', { name: 'History' }).click();
  await page.locator('.history-item.type-award').getByRole('button', { name: 'Correct mistake' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason for correction').fill('Wrong child');
  await expect(dialog.getByText(/would leave Ama with -15 stars/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save correction' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.locator('.history-item.type-redemption').getByRole('button', { name: 'Correct mistake' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Tapped by mistake' }).click();
  await dialog.getByRole('button', { name: 'Reverse redemption' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('15');
  await expect(page.getByText('Reward redemption reversed').first()).toBeVisible();
  await expect(page.locator('.history-item.type-redemption').getByRole('button', { name: 'Correct mistake' })).toHaveCount(0);

  await page.locator('.history-item.type-award').getByRole('button', { name: 'Correct mistake' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Wrong child' }).click();
  await dialog.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('0');
});

test('price change asks for review; archiving hides choices but keeps history', async ({ page, context }) => {
  await setUp(page, { opening: [30, 0] });
  await card(page, 'Ama').getByRole('link', { name: 'Rewards' }).click();
  await page.getByRole('button', { name: 'Redeem Skating at the mall' }).click();

  // Change the price in another tab while the confirmation is open.
  const other = await context.newPage();
  await other.goto('./#/rewards');
  await other.getByRole('button', { name: /Skating at the mall/ }).click();
  await other.getByLabel('Star cost', { exact: true }).fill('12');
  await other.getByRole('button', { name: 'Save' }).click();
  await expect(other.getByText('12 stars')).toBeVisible();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('has changed to 12 stars')).toBeVisible();
  await dialog.getByRole('button', { name: 'Review new cost' }).click();
  await expect(dialog).toContainText('Ama will have 18 stars left.');
  await dialog.getByRole('button', { name: 'Redeem for 12 stars' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('18');

  // Archive the reward in the other tab.
  await other.getByRole('button', { name: /Skating at the mall/ }).click();
  await other.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByRole('button', { name: 'Redeem Skating at the mall' })).toHaveCount(0);
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.locator('.history-item.type-redemption')).toContainText('Skating at the mall');
  await expect(page.locator('.history-item.type-redemption')).toContainText('Cost 12 stars');
});

test('stale tab cannot overspend', async ({ page, context }) => {
  await setUp(page, { opening: [18, 0] });
  await card(page, 'Ama').getByRole('link', { name: 'Rewards' }).click();
  const url = page.url();

  const tabB = await context.newPage();
  await tabB.goto(url);
  await tabB.getByRole('button', { name: 'Redeem Skating at the mall' }).click();

  await page.getByRole('button', { name: 'Redeem Skating at the mall' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Redeem for 15 stars' }).click();
  await expect(page.locator('.detail-head .balance-num')).toHaveText('3');

  // Tab B's open confirmation now reflects the stored balance and blocks the redemption.
  const dialogB = tabB.getByRole('dialog');
  await expect(dialogB).toContainText('12 more stars needed');
  await expect(dialogB.getByRole('button', { name: 'Redeem for 15 stars' })).toBeDisabled();
  await dialogB.getByRole('button', { name: 'Cancel' }).click();
  await tabB.getByRole('link', { name: 'History' }).click();
  await expect(tabB.locator('.history-item.type-redemption')).toHaveCount(1);
});

test('data survives reload', async ({ page }) => {
  await setUp(page);
  await awardToys(page, 'Kofi');
  await page.reload();
  await expectBalance(page, 'Kofi', 1);
  await expect(page.getByLabel('Nickname')).toHaveCount(0);
});

test('a failed save shows an error and no success', async ({ page }) => {
  await setUp(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = function () {
      throw new DOMException('Simulated failure', 'QuotaExceededError');
    };
  });
  await card(page, 'Ama').getByRole('button', { name: 'Award stars' }).click();
  await page.getByRole('button', { name: /Put toys away/ }).click();
  await page.getByRole('button', { name: 'Award 1 star' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Could not save—please try again.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Put toys away/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect(page.locator('.burst')).toHaveCount(0);
  await expectBalance(page, 'Ama', 0);
  await page.reload();
  await expectBalance(page, 'Ama', 0);
});

test('reduced motion: awarding works without the animation', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await setUp(page);
  await awardToys(page, 'Ama');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.burst')).toHaveCount(0);
  await expectBalance(page, 'Ama', 1);
  await context.close();
});

test('celebration plays normally and can be turned off', async ({ page }) => {
  await setUp(page);
  await awardToys(page, 'Ama');
  await expect(page.locator('.burst')).toHaveCount(1);
  await page.goto('./#/settings');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).not.toBeChecked();
  await page.goto('./#/');
  await awardToys(page, 'Ama');
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.burst')).toHaveCount(0);
});

test('no horizontal scrolling at 320px on any screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await setUp(page, { names: ['Abenaa-Serwaa', 'Kwabena'], opening: [7, 22] });
  const check = async (label: string) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${label}`).toBeLessThanOrEqual(0);
  };
  await check('home');
  await card(page, 'Kwabena').getByRole('button', { name: 'Award stars' }).click();
  await check('award sheet');
  await page.keyboard.press('Escape');
  for (const r of ['#/activities', '#/rewards', '#/settings']) {
    await page.goto('./' + r);
    await check(r);
  }
  await page.goto('./#/');
  await card(page, 'Kwabena').getByRole('link', { name: 'Rewards' }).click();
  await check('child rewards');
  await page.getByRole('button', { name: 'Redeem Eat out' }).click();
  await check('redeem sheet');
  await context.close();
});
