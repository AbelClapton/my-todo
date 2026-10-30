import { expect, test } from '@playwright/test';

import {
  capture,
  openCalendar,
  openDeferSheet,
  openTasks,
  rowFor,
  seed,
  showAll,
  swipe,
} from './support';

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

test('the zoom walks Day, Week, Month and Year on the keyboard', async ({ page }) => {
  await openCalendar(page);
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();

  await page.keyboard.press('Control+=');
  await expect(page.getByText(/^Week \d+ ·/)).toBeVisible();

  // The zoom walks Day → Week → Month → Year, and back.
  await page.keyboard.press('Control+=');
  await expect(page.getByText(/^[A-Z][a-z]+ \d{4}$/)).toBeVisible();

  await page.keyboard.press('Control+=');
  await expect(page.getByText(/^20\d{2}$/)).toBeVisible();
  // Year is the end of the list, so a fourth press stays there.
  await page.keyboard.press('Control+=');
  await expect(page.getByText(/^20\d{2}$/)).toBeVisible();

  await page.keyboard.press('Control+-');
  await expect(page.getByText(/^[A-Z][a-z]+ \d{4}$/)).toBeVisible();
  await page.keyboard.press('Control+-');
  await expect(page.getByText(/^Week \d+ ·/)).toBeVisible();

  await page.keyboard.press('Control+-');
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();

  // The Week's focus line is the way into a Day.
  await page.keyboard.press('Control+=');
  await page.getByRole('button', { name: 'Open day' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();
});

/** A capture leaves a two-second confirmation toast; let it go before asserting. */
async function toastGone(page: Parameters<typeof openTasks>[0]): Promise<void> {
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
}

test('the Day opens with a Daily Note, and a new event lands on the axis', async ({ page }) => {
  await openCalendar(page);
  // Rollover: `day.opened` and the Daily Note are written by the view itself.
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();
  await expect(page.getByText('Mon, Sep 28')).toBeVisible();

  await page.getByRole('link', { name: 'New event' }).click();
  await expect(page.getByRole('heading', { name: 'New event' })).toBeVisible();

  // The three canned answers, each showing the moment it resolves to.
  await expect(page.getByRole('button', { name: /^Now/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Tomorrow/ })).toBeVisible();

  await page.getByRole('textbox').fill('Design review');
  await page.getByRole('button', { name: 'Add event' }).click();

  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  // The block on the axis, and the now line that now names it.
  await expect(page.getByLabel('Timeline').getByText('Design review')).toBeVisible();
  await expect(page.getByText(/Design review in \d+ min/)).toBeVisible();
});

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

test('the morning plan commits a task to the Day, and the undo takes it back', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Draft the Q4 plan']);

  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Plan today' })).toBeVisible();
  // Nothing is on the Day yet, and the picker is empty rather than wrong: the
  // fourth candidate source is the search.
  await expect(page.getByRole('button', { name: 'Done' })).toBeDisabled();

  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('draft');
  await page.getByRole('button', { name: 'Keep Draft the Q4 plan' }).click();
  await expect(page.getByRole('heading', { name: /1 of 3/ })).toBeVisible();

  await page.getByRole('button', { name: 'Done' }).click();

  // It lands on the Day, with the plan on it and the reversal still reachable.
  await expect(page.getByRole('heading', { name: 'Top three' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Planned. Undo?');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Top three' })).toHaveCount(0);
});

test('the shutdown closes the Day, plans tomorrow, and lets go of both', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Renew passport']);

  await page.goto('/shutdown');
  await expect(page.getByRole('heading', { name: 'Close day' })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'One line for the Daily Note' })
    .fill('shipped the draft');

  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('renew');
  await page.getByRole('button', { name: 'Keep Renew passport' }).click();
  await page.getByRole('button', { name: 'Close day' }).click();

  // The user lands on tomorrow (`06-flows/shutdown.md` �The commit), and the
  // plan they set up the night before is already on it.
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByText('Tue 29 Sep')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top three' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Day closed. Undo?');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Top three' })).toHaveCount(0);
});
