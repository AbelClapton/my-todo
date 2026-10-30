import { expect, test, type Page } from '@playwright/test';

import { openDeferSheet, openTasks, rowFor, seed } from './support';

/**
 * Every screen, at every viewport and mode the config names — *"Screenshots are
 * compared against a committed baseline. Any diff fails CI. Baselines are
 * updated manually (never auto-accepted)"* (`10-engineering/testing.md`).
 *
 * **The baselines are platform-specific**, because font rasterisation is. They
 * were generated on Windows; a CI runner on Linux must regenerate them once on
 * its own image before the comparison means anything. That is the cost the doc's
 * "never auto-accepted" rule buys, and it is cheaper than a suite that compares
 * nothing.
 *
 * The toast is waited out rather than excluded, because a screenshot with a
 * consequence surface over it is not a screenshot of the screen.
 */

async function settle(page: Page): Promise<void> {
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
}

test('the Tasks screen, empty', async ({ page }) => {
  await openTasks(page);
  await settle(page);
  await expect(page).toHaveScreenshot('tasks-empty.png');
});

test('the Tasks screen, with rows', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['File Q4 taxes', 'Call contractor', 'Buy groceries']);
  await settle(page);
  await expect(page).toHaveScreenshot('tasks-rows.png');
});

test('the Task detail screen', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['File Q4 taxes']);
  await settle(page);
  await rowFor(page, 'File Q4 taxes').getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'File Q4 taxes' })).toBeVisible();
  await expect(page).toHaveScreenshot('task-detail.png');
});

test('the defer sheet', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Call contractor']);
  await settle(page);
  await openDeferSheet(page, 'Call contractor');
  await expect(page).toHaveScreenshot('defer-sheet.png');
});
