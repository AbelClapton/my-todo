import { expect, test } from '@playwright/test';

import { capture, openDeferSheet, openTasks, rowFor, seed, showAll, swipe } from './support';

/**
 * The two Phase 0 flows `10-engineering/testing.md` requires — *"Capture → task
 * created → completed → undone"* and *"Swipe right completes; swipe left
 * defers"* — plus the keyboard equivalents, which are the primary path on the
 * web (`03-experience/gesture-vocabulary.md` §Keyboard equivalents).
 *
 * Every assertion is on **what the user sees**, not on the log: the log is an
 * implementation detail behind the projection, and a test that read it directly
 * would pass while the screen showed nothing.
 */

/** A capture leaves a two-second confirmation toast; let it go before asserting. */
async function toastGone(page: Parameters<typeof openTasks>[0]): Promise<void> {
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
}

test('capture, complete and undo', async ({ page }) => {
  await openTasks(page);
  await capture(page, 'File Q4 taxes');
  await showAll(page);
  await expect(rowFor(page, 'File Q4 taxes')).toBeVisible();

  await swipe(page, 'File Q4 taxes', 160);

  await expect(page.getByRole('status')).toContainText('Completed. Undo?');
  await expect(rowFor(page, 'File Q4 taxes')).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(rowFor(page, 'File Q4 taxes')).toBeVisible();
});

test('a swipe short of the threshold completes nothing', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Call contractor']);
  await toastGone(page);

  // 40% of the row or 120px, whichever is less — 60px is neither.
  await swipe(page, 'Call contractor', 60);

  await expect(rowFor(page, 'Call contractor')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('swipe left defers, and the deferred task leaves Today', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Call contractor']);
  await openDeferSheet(page, 'Call contractor');

  const sheet = page.getByRole('dialog');
  // The sheet names the task it is about, and states the field it sets.
  await expect(sheet).toContainText('Call contractor');
  await expect(sheet).toContainText('Becomes visible on this day');
  // Every dated row shows the date it resolves to (ADR 0032).
  await expect(sheet).toContainText('Tue 29 Sep');
  await expect(sheet).toContainText('Mon 5 Oct');

  await sheet.getByRole('button', { name: /Tomorrow/ }).click();

  await expect(page.getByRole('status')).toContainText('Deferred to Tue 29 Sep. Undo?');
  await expect(page.getByRole('img', { name: 'is deferred' })).toBeVisible();

  await page.getByRole('radio', { name: 'Today' }).click();
  await expect(rowFor(page, 'Call contractor')).toHaveCount(0);
});

test('Someday is a state, and its undo is a state', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Buy groceries']);
  await openDeferSheet(page, 'Buy groceries');

  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Someday/ })
    .click();
  await expect(page.getByRole('status')).toContainText('Moved to Someday. Undo?');

  await page.getByRole('radio', { name: 'Someday' }).click();
  await expect(rowFor(page, 'Buy groceries')).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(rowFor(page, 'Buy groceries')).toHaveCount(0);
});

test('the keyboard equivalents complete and defer', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['File Q4 taxes']);

  await rowFor(page, 'File Q4 taxes').getByRole('button', { pressed: false }).focus();
  await page.keyboard.press('d');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await rowFor(page, 'File Q4 taxes').getByRole('button', { pressed: false }).focus();
  await page.keyboard.press('e');
  await expect(page.getByRole('status')).toContainText('Completed. Undo?');
});

test('the undo window expires and the completion stands', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Buy groceries']);

  await swipe(page, 'Buy groceries', 160);
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();

  // Five seconds, then the reversal is gone and the row stays gone.
  await toastGone(page);
  await expect(rowFor(page, 'Buy groceries')).toHaveCount(0);
});
