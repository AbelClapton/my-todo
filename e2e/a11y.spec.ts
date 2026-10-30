import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { openCalendar, openDeferSheet, openTasks, openYear, rowFor, seed } from './support';

/**
 * axe against every screen, at every viewport and mode — *"Failures block the
 * PR"* (`10-engineering/testing.md`).
 *
 * The doc lists what it expects to catch: contrast at WCAG AA, form labels,
 * heading hierarchy, ARIA roles, keyboard reachability, and visible focus. Only
 * the first four are mechanical — axe cannot press keys — so the keyboard
 * requirements are covered by `flows.spec.ts`, which drives the row by keyboard
 * and asserts the sheet opens and closes.
 *
 * Tag set: `wcag2a`/`wcag2aa` are the floor the doc names. The 2.1 tags are
 * included because every browser this ships to implements 2.1, and a rule that
 * only exists in 2.1 (like a keyboard-trap check) is still a real defect.
 */

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const summarised = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));

  expect(summarised).toEqual([]);
}

test('the Calendar Day view', async ({ page }) => {
  await openCalendar(page);
  await expectNoViolations(page);
});

test('the Calendar Year view', async ({ page }) => {
  await openYear(page);
  await expectNoViolations(page);
});

test('the Tasks screen, empty', async ({ page }) => {
  await openTasks(page);
  await expectNoViolations(page);
});

test('the Tasks screen, with rows', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['File Q4 taxes', 'Call contractor']);
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
  await expectNoViolations(page);
});

test('the Task detail screen', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['File Q4 taxes']);
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
  await rowFor(page, 'File Q4 taxes').getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'File Q4 taxes' })).toBeVisible();
  await expectNoViolations(page);
});

test('the defer sheet', async ({ page }) => {
  await openTasks(page);
  await seed(page, ['Call contractor']);
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
  await openDeferSheet(page, 'Call contractor');
  await expectNoViolations(page);
});
